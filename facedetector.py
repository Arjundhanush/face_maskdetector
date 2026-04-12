import cv2

prototxtPath = "face_detector/deploy.prototxt"
weightsPath = "face_detector/res10_300x300_ssd_iter_140000.caffemodel"

faceNet = cv2.dnn.readNet(prototxtPath, weightsPath)

from tensorflow.keras.models import load_model
import numpy as np

model = load_model("model/mask_detector.keras")

cap = cv2.VideoCapture(0)

while True:
    ret, frame = cap.read()
    h, w = frame.shape[:2]

    blob = cv2.dnn.blobFromImage(frame, 1.0, (300, 300),
                                 (104.0, 177.0, 123.0))

    faceNet.setInput(blob)
    detections = faceNet.forward()

    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]

        if confidence > 0.5:
            box = detections[0, 0, i, 3:7] * \
                  np.array([w, h, w, h])
            (startX, startY, endX, endY) = box.astype("int")

            face = frame[startY:endY, startX:endX]
            face = cv2.resize(face, (224, 224))
            face = face / 255.0
            face = np.reshape(face, (1, 224, 224, 3))

            pred = model.predict(face)[0][0]

            if pred < 0.5:
                label = "Mask"
            elif pred > 0.7:
                label = "No Mask"
            else:
                label = "Uncertain"
            
            if label == "Mask":
                color = (0, 255, 0)
            elif label == "No Mask":
                color = (0, 0, 255)
            else:
                color = (0, 255, 255) # Yellow for Uncertain

            cv2.putText(frame, label, (startX, startY - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            cv2.rectangle(frame, (startX, startY),
                          (endX, endY), color, 2)

    cv2.imshow("Mask Detector", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()