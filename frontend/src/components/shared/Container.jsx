/*
  Keeps every section inside the same invisible column. Without it, lines of
  text stretch across a wide monitor and get hard to read.

  mx-auto           centres the box
  max-w-[1180px]    never wider than 1180 pixels
  px-6 sm:px-8      breathing room left and right
*/
export default function Container({ children, className }) {
  // className lets a section add its own padding. It may be missing.
  let extraClasses = '';
  if (className) {
    extraClasses = className;
  }

  return (
    <div className={'mx-auto w-full max-w-[1180px] px-6 sm:px-8 ' + extraClasses}>
      {children}
    </div>
  );
}
