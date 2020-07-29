const cv = require('opencv4nodejs');

const devicePort = 0;
const wCap = new cv.VideoCapture(devicePort);

const delay = 100;  //フレームレート(ms)
let done = false;

let frame = wCap.read();
let binFrame = frame.bgrToGray().threshold(100, 255, 0);  //二値化の閾値
let preFrame = binFrame;

let count = 0;
let stilled = false;

while (!done) {
  frame = wCap.read();

  if (frame.empty) {
    wCap.reset();
    frame = wCap.read();
  }

  binFrame = frame.bgrToGray().threshold(100, 255, 0);

  let contours = binFrame.absdiff(preFrame).findContours(0, 1);
  let rectangles = contours.map((contour: any) => contour.boundingRect());
  let differences = rectangles.filter((rectangle: any) => rectangle.width > 100);

  count = differences.length != 0 ? 0 : count + 1;
  count = count > 10 ? 10 : count;
  stilled = count == 0 ? false : stilled;

  if (!stilled && count == 10) {
    stilled = true;
    console.log('stilled in ' + new Date());
  }

  cv.imshow('diff', frame);

  preFrame = binFrame;

  const key = cv.waitKey(delay);
  done = key !== -1;
}
