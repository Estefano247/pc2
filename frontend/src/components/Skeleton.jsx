export default function Skeleton({ width, height = "1rem", borderRadius = "0.5rem", style, className = "" }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function BookSkeleton() {
  return (
    <div className="libro skeleton-book">
      <div className="book-cover skeleton-cover" />
      <div className="book-content">
        <Skeleton height="1.2rem" width="80%" />
        <Skeleton height="0.85rem" width="50%" style={{ marginTop: "0.5rem" }} />
        <Skeleton height="2.5rem" width="100%" style={{ marginTop: "0.8rem" }} />
        <div className="book-footer" style={{ marginTop: "1rem" }}>
          <Skeleton height="1.5rem" width="40%" />
          <Skeleton height="2.5rem" width="90px" borderRadius="0.5rem" />
        </div>
      </div>
    </div>
  );
}
