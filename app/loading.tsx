import LoadingSpinner from "./components/LoadingSpinner";

export default function Loading() {
  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
      <LoadingSpinner message="Loading..." />
    </div>
  );
}
