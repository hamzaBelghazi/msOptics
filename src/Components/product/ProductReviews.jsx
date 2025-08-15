import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import Star from "@mui/icons-material/Star";
import ThumbUp from "@mui/icons-material/ThumbUp";
import Verified from "@mui/icons-material/Verified";
import CalendarToday from "@mui/icons-material/CalendarToday";
import Person from "@mui/icons-material/Person";
import { useAuth } from "../Context/AuthContext";
import axios from "axios";
import Image from "next/image";

const ProductReviews = ({ productId, reviewsData }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(
    reviewsData?.stats || {
      averageRating: 0,
      totalReviews: 0,
      distribution: {},
    }
  );
  const [pagination, setPagination] = useState(
    reviewsData?.pagination || {
      currentPage: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    }
  );

  const [newReview, setNewReview] = useState({
    rating: 5,
    comment: "",
    title: "",
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Fetch reviews
  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reviews/product/${productId}`,
        {
          params: {
            page,
            limit: 10,
            status: "approved",
          },
        }
      );

      // Check if response has the expected structure
      if (response.data && response.data.data) {
        setReviews(response.data.data.reviews || []);
        setStats(
          response.data.data.stats || {
            averageRating: 0,
            totalReviews: 0,
            distribution: {},
          }
        );
        setPagination(
          response.data.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          }
        );
      } else {
        // Handle unexpected response structure
        console.warn("Unexpected API response structure:", response.data);
        setReviews([]);
        setStats({
          averageRating: 0,
          totalReviews: 0,
          distribution: {},
        });
        setPagination({
          currentPage: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
      // Set default values on error
      setReviews([]);
      setStats({
        averageRating: 0,
        totalReviews: 0,
        distribution: {},
      });
      setPagination({
        currentPage: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (reviewsData) {
      setReviews(reviewsData.reviews || []);
      setLoading(false);
    }
  }, []);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to submit a review");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("product", productId);
      formData.append("rating", newReview.rating);
      formData.append("comment", newReview.comment);
      if (newReview.title) {
        formData.append("title", newReview.title);
      }

      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reviews`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Reset form
      setNewReview({ rating: 5, comment: "", title: "" });
      setSelectedFiles([]);
      setShowReviewForm(false);

      // Refresh reviews
      fetchReviews();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert(error.response?.data?.message || "Error submitting review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    if (!user) {
      alert("Please login to mark reviews as helpful");
      return;
    }

    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/reviews/${reviewId}/helpful`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      // Update local state
      setReviews((prevReviews) =>
        prevReviews.map((review) =>
          review._id === reviewId
            ? {
                ...review,
                helpful: review.helpfulUsers?.includes(user.id)
                  ? review.helpful - 1
                  : review.helpful + 1,
                helpfulUsers: review.helpfulUsers?.includes(user.id)
                  ? review.helpfulUsers.filter((id) => id !== user.id)
                  : [...(review.helpfulUsers || []), user.id],
              }
            : review
        )
      );
    } catch (error) {
      console.error("Error marking review as helpful:", error);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const StarRating = ({
    rating,
    setRating,
    size = "text-lg sm:text-xl md:text-2xl",
    readonly = false,
  }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && setRating && setRating(star)}
            className={`${size} ${
              !readonly && setRating
                ? "cursor-pointer hover:scale-110 transition-transform"
                : ""
            }`}
            disabled={readonly}
          >
            {star <= rating ? (
              <StarIcon className="text-yellow-400 fill-current" />
            ) : (
              <StarBorderIcon className="text-gray-300" />
            )}
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-xl border border-gray-200 dark:border-gray-700">
      {/* Reviews Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 sm:mb-6">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-2 rounded-lg self-start sm:self-auto">
          <Star className="text-white text-lg sm:text-xl" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Customer Reviews
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      i < Math.floor(stats.averageRating)
                        ? "text-yellow-400 fill-current"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <span className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {stats.averageRating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              ({stats.totalReviews} reviews)
            </span>
          </div>
        </div>
      </div>

      {/* Review Form Toggle */}
      {user && (
        <div className="mb-6 sm:mb-8">
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
            >
              Write a Review
            </button>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-3 sm:p-4 md:p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 dark:text-white">
                  Write a Review
                </h3>
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmitReview}>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium">
                    Your Rating
                  </label>
                  <StarRating
                    rating={newReview.rating}
                    setRating={(rating) =>
                      setNewReview({ ...newReview, rating })
                    }
                    size="text-2xl sm:text-3xl md:text-4xl"
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium">
                    Review Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={newReview.title}
                    onChange={(e) =>
                      setNewReview({ ...newReview, title: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600 text-sm sm:text-base"
                    placeholder="Brief summary of your experience..."
                    maxLength={100}
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium">
                    Your Review
                  </label>
                  <textarea
                    value={newReview.comment}
                    onChange={(e) =>
                      setNewReview({ ...newReview, comment: e.target.value })
                    }
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600 resize-none text-sm sm:text-base"
                    rows="4"
                    placeholder="Share your experience with this product..."
                    required
                    maxLength={1000}
                  />
                </div>
                <div className="mb-3 sm:mb-4">
                  <label className="block text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 font-medium">
                    Add Photos (Optional)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 dark:border-gray-600 text-sm sm:text-base"
                  />
                  {selectedFiles.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {selectedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Review"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    className="px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-300 text-sm sm:text-base"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4 sm:space-y-6">
        {reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No reviews yet. Be the first to review this product!
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review._id}
              className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3 sm:p-4 md:p-6 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Image
                      src={
                        `${process.env.NEXT_PUBLIC_SERVER_URL}/img/users/${review.user?.image}` ||
                        "/default-avatar.jpg"
                      }
                      alt={`${review.user?.firstName} ${review.user?.lastName}`}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                        {review.user?.firstName + " " + review.user?.lastName ||
                          "Anonymous"}
                      </h3>
                      {review.verified && (
                        <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full self-start sm:self-auto">
                          <Verified className="w-3 h-3 text-green-600 dark:text-green-400" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Verified
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <CalendarToday className="w-3 h-3" />
                      {new Date(review.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 self-start sm:self-auto">
                  <StarRating
                    rating={review.rating}
                    size="w-3 h-3 sm:w-4 sm:h-4"
                    readonly={true}
                  />
                </div>
              </div>

              {review.title && (
                <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {review.title}
                </h4>
              )}

              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-3 sm:mb-4 leading-relaxed">
                {review.comment}
              </p>

              {/* Review Images */}
              {review.images && review.images.length > 0 && (
                <div className="flex gap-2 mb-3 sm:mb-4 overflow-x-auto">
                  {review.images.map((image, index) => (
                    <div
                      key={index}
                      className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0"
                    >
                      <img
                        src={`${process.env.NEXT_PUBLIC_SERVER_URL}/img/reviews/${image}`}
                        alt={`Review image ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Helpful Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMarkHelpful(review._id)}
                  className={`flex items-center gap-1 text-xs sm:text-sm transition-colors ${
                    review.helpfulUsers?.includes(user?.id)
                      ? "text-blue-500 dark:text-blue-400"
                      : "text-gray-600 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                  }`}
                >
                  <ThumbUp className="w-3 h-3 sm:w-4 sm:h-4" />
                  Helpful ({review.helpful})
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Load More Reviews */}
      {pagination.hasNext && (
        <div className="mt-6 sm:mt-8 text-center">
          <button
            onClick={() => fetchReviews(pagination.currentPage + 1)}
            className="w-full sm:w-auto bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
          >
            Load More Reviews
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
