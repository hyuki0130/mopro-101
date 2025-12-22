PROJECT_NAME=$1

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
echo $PROJECT_HOME

MOPRO_DIR="${PROJECT_HOME}/mopro/${PROJECT_NAME}"

cd $MOPRO_DIR
mopro build --mode debug \
  --platforms react-native \
  --architectures aarch64-apple-ios \
  --architectures aarch64-apple-ios-sim \
  --architectures aarch64-linux-android