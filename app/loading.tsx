export default function Loading() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-100 backdrop-blur-sm flex items-center justify-center">
      <div className="text-2xl font-medium text-indigo-800 animate-pulse">
        Loading...
      </div>
    </div>
  );
}
