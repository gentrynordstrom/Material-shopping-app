export default function ErrorMessage({ message, onRetry }) {
  return (
    <div className="error-box">
      <p className="error-text">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
