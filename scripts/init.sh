PROJECT_NAME=$1

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
echo $PROJECT_HOME

cd ${PROJECT_HOME}/mopro && rm -rf ${PROJECT_NAME} && mopro init --adapter noir --project-name ${PROJECT_NAME}

# ${PROJECT_HOME}/scripts/copy_circuit.sh ${PROJECT_NAME}
${PROJECT_HOME}/scripts/generate_srs.sh ${PROJECT_NAME}
${PROJECT_HOME}/scripts/build.sh ${PROJECT_NAME}


