import LoadingSpinner from "./components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-100 backdrop-blur-sm flex items-center justify-center">
      <LoadingSpinner message="Loading..." />
    </div>
  );
}
