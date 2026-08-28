export default function Container({ className = '', children }) {
  return <div className={`mx-auto w-full max-w-[1180px] px-6 sm:px-8 ${className}`}>{children}</div>;
}
