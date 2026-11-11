/*
  Small number helpers used by the money maths in this folder.
  They were copied into plan.js and shocks.js before, so they live here once.
*/


/*
  Keeps a number inside a range.

    keepBetween(70, 10, 50)     ->  50
    keepBetween('abc', 10, 50)  ->  10   (anything that is not a number becomes the lowest value)
*/
export function keepBetween(value, lowest, highest) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return lowest;
  }
  if (number < lowest) {
    return lowest;
  }
  if (number > highest) {
    return highest;
  }
  return number;
}


// Rounds to the nearest 500, so estimates read like 15,000 rather than 14,880.
export function roundToNearest500(value) {
  return Math.round(value / 500) * 500;
}
