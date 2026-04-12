from tensorflow.keras.preprocessing.image import ImageDataGenerator

train_datagen= ImageDataGenerator(
    rescale=1./255,
    validation_split=0.2)

train_data=train_datagen.flow_from_directory(
    "dataset",
    target_size=(224,224),
    batch_size=32,
    class_mode="binary",
    subset="training"
)
val_data=train_datagen.flow_from_directory(
    "dataset",
    target_size=(224,224),
    batch_size=32,
    class_mode="binary",
    subset="validation"
)
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import GlobalAveragePooling2D,Flatten,Dense,Dropout
from tensorflow.keras.models import Model

baseModel =MobileNetV2(weights="imagenet",include_top=False,input_shape=(224,224,3))

for layer in baseModel.layers:
    layer.trainable = False

x=baseModel.output
x=GlobalAveragePooling2D()(x)
x=Dense(128,activation="relu")(x)
x=Dense(1,activation="sigmoid")(x)

model=Model(inputs=baseModel.input,outputs=x)

model.compile(
    optimizer="adam",
    loss="binary_crossentropy",
    metrics=["accuracy"]
)

model.fit(
    train_data,
    validation_data=val_data,
    epochs=3
)

model.save("model/mask_detector.keras")
