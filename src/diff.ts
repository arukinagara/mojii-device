const cv = require('opencv4nodejs');

const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();

const admin = require('firebase-admin');
const serviceAccount = require('/app/device/mojii-285301-b391b0b45469.json');
admin.initializeApp({credential: admin.credential.cert(serviceAccount)});
const db = admin.firestore();
const docRef = db.collection('docs').doc('demo1');

async function main() {
  const devicePort = 0;
  const wCap = new cv.VideoCapture(devicePort);

  const delay = 100;  //フレームレート(ms)
  let done = false;

  let frame = wCap.read();
  let binaryFrame = frame.bgrToGray().threshold(100, 255, 0);  //二値化の閾値
  let prevFrame = binaryFrame;
  let sentFrame = binaryFrame;

  let count = 0;
  let isStatic = false;

  while (!done) {
    frame = wCap.read();

    if (frame.empty) {
      wCap.reset();
      frame = wCap.read();
    }

    binaryFrame = frame.bgrToGray().threshold(100, 255, 0);

    count = diffFrame(binaryFrame, prevFrame) != 0 ? 0 : count + 1;
    count = count > 10 ? 10 : count;
    isStatic = count == 0 ? false : isStatic;

    if (!isStatic && count == 10) {
      isStatic = true;

      if (diffFrame(binaryFrame, sentFrame) != 0) {
        console.log('sent in ' + new Date());

        const base64 =  cv.imencode('.jpg', frame).toString('base64');
        const request = {
          image: {
            content: base64,
          }
        };

        const [result] = await client.textDetection(request);
        const detections = result.textAnnotations;

        if (detections.length != 0) {
          //console.log(detections[0].description);
          let result = await docRef.set({
            text: detections[0].description,
          });
        }

        sentFrame = binaryFrame;
      }
    }

    cv.imshow('diff', frame);

    prevFrame = binaryFrame;
    const key = cv.waitKey(delay);
    done = key !== -1;
  }
}

function diffFrame(frame1: any, frame2: any) {
  let contours = frame1.absdiff(frame2).findContours(0, 1);
  let rectangles = contours.map((contour: any) => contour.boundingRect());
  let differences = rectangles.filter((rectangle: any) => rectangle.width > 100); //小さい差分のフィルタリング

  return differences.length;
}

main();
