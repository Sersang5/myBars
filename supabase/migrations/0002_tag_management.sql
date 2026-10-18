-- Tag management: merge two tags atomically and clean up tags no bar uses.
-- Both run as the caller (security invoker), so row level security still limits them to the user's own rows.

create function public.merge_tags(source_id uuid, target_id uuid) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if source_id = target_id then
    return;
  end if;
  if not exists (select 1 from public.tags where id = target_id) then
    raise exception 'merge_tags: target tag % not found', target_id;
  end if;

  -- Bars that have both tags keep the target's rating, or take the source's when the target has none.
  update public.bar_tags t
     set rating = coalesce(t.rating, s.rating)
    from public.bar_tags s
   where s.tag_id = source_id
     and t.tag_id = target_id
     and t.my_bar_id = s.my_bar_id;

  insert into public.bar_tags (my_bar_id, tag_id, rating)
  select my_bar_id, target_id, rating from public.bar_tags where tag_id = source_id
  on conflict (my_bar_id, tag_id) do nothing;

  -- Cascades to the source's remaining bar_tags rows.
  delete from public.tags where id = source_id;
end;
$$;

create function public.delete_unused_tags() returns void
language sql security invoker set search_path = '' as $$
  delete from public.tags t
   where not exists (select 1 from public.bar_tags bt where bt.tag_id = t.id);
$$;

revoke execute on function public.merge_tags(uuid, uuid) from public, anon;
revoke execute on function public.delete_unused_tags() from public, anon;
grant execute on function public.merge_tags(uuid, uuid) to authenticated;
grant execute on function public.delete_unused_tags() to authenticated;
