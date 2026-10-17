import type { ReviewSource } from "./types";

/** v1: reviews come straight from the Places details response. */
export const detailsReviewSource: ReviewSource = {
  getReviews: (details) => details.reviews,
};
