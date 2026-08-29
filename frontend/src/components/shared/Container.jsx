/*
  Container
  ---------
  Every section on the site keeps its text inside the same invisible column,
  otherwise lines of text would stretch right across a wide monitor and become
  hard to read.

  mx-auto           centres the box on the page
  max-w-[1180px]    never grow wider than 1180 pixels
  px-6 sm:px-8      leave breathing room on the left and right
*/
export default function Container({ children, className }) {
  // "className" lets a section add extra classes, usually padding above and below.
  // It may be missing, so fall back to an empty string.
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
