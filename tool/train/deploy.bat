
docker build -t docker.io/stephanzlatarev/norman-trainer .
docker push docker.io/stephanzlatarev/norman-trainer
call k norman apply -f ./kubernetes.yaml
