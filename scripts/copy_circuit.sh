PROJECT_DIR=$1

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
echo $PROJECT_HOME

rm -rf ${PROJECT_HOME}/mopro/${PROJECT_DIR}/test-vectors/noir/*
cp ${PROJECT_HOME}/circuits/${PROJECT_DIR}/target/${PROJECT_DIR}.json ${PROJECT_HOME}/mopro/${PROJECT_DIR}/test-vectors/noir/
