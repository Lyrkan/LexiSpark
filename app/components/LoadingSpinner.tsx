export default function LoadingSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      <div className="text-lg font-medium text-gray-600">{message}</div>
    </div>
  );
}
