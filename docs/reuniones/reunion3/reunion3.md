- Variables de entorno, inyectar secrets y customizar un poco los deployments de los diferentes servicios.
- Se crearon proyecto en gcp omnichannel-dev y omnichannel-common para guardar el stage y cuentas de servicio. Es un proyecto centralizado.
- Para todos los países debiéramos tener algo como, usando el prefijo del país y el ambiente.
    - implementos-es-dev: España.
    - implementos-pe-prod: Perú
- Se creo un repositorio devops-deploy-core.
    - Repositorio central donde podemos almacenar algun tipo de template.
    - Lo podemos usar con kustomize si queremos.
    - En el **`k8s/deployment.yaml`** tiene variables como placeholders.


- Se creo un repositorio devops-deploy-core. Es un repositorio central donde podemos almacenar algunos tipos de templates. Esto lo podríamos usar incluso con kustomize si queremos.
- Si vemos por ejemplo el `k8s/deploment.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    app: ${APP}
    env: ${ENV}
  name: ${APP}
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${APP}
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      labels:
        app: ${APP}
        version: ${RELEASE_VERSION}
        env: ${ENV}
    spec:
      containers:
      - image:  _IMAGE_
        imagePullPolicy: Always
        ports:
        - containerPort: 80
        name: ${APP}
        envFrom:
        - configMapRef:
            name: ${APP}-config
        env:
        - name: VERSION
          value: ${RELEASE_VERSION}
        - name: PORT
          value: "80"
        - name: MONGO_URI
          valueFrom:
            secretKeyRef:
              name: db-mongo-conn-str
              key: MONGO_URI
        - name: MONGO_CLOUD_URI
          valueFrom:
            secretKeyRef:
              name: db-mongo-conn-str
              key: MONGO_CLOUD_URI
        - name: CACHE_URI
          valueFrom:
            secretKeyRef:
              name: db-mongo-conn-str
              key: CACHE_URI   
        resources:
          limits:
            cpu: ${CPU_LIMIT}
            memory: ${MEMORY_LIMIT}
          requests:
            cpu: ${CPU_REQUEST}
            memory: ${MEMORY_REQUEST}                         
      # resources:
      #   limits:
      #     cpu: 400m
      #     memory: 400M
      #   requests:
      #     cpu: 200m
      #     memory: 100M
      volumes:
        - emptyDir: {}
          name: codebase
---
apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: ${APP}
  namespace: default
spec:
  maxReplicas: 15
  minReplicas: 2
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${APP}
  targetCPUUtilizationPercentage: 70
```

Tenemos variables como placeholders. Cuando vaya el deployment, dependiendo de las variables de entorno o secrets que tenga tenga inyectarselas. Pero hay cosas que serán siempres las mismas, por ejemplo el ${APP} va a ser el nombre del repo. Se esta llevando la convención? para no tener distintos nombres, que por ejemplo estabamos con api-ecommerce-article, el service tiene un nombre, el app tiene un nombre, el tratar de llevarlo mas homogeneo. Algunos datos que vamos a tener comunes van a ir aquí y dependiendo de donde tengamos la configuración que tengamos en el repositorio podemos jugar con las variables de entorno por ambiente global, asi como también secrets por organización, secrets globales o secrets por producto. La idea es tomar aqui las bases, por ejemplo, si queremos agregar una anotación, por ejemplo tenemos un datalog y queremos agregar una anotación que va a afectar a todo el mundo, con agregarla aqui una vez ya tenemos. Y despues al deployar los microservicios ya traemos esas configuraciones y no tenemos que ir repo por repo cambiando una configuración ya que sería tediosa la administración.

Dentro del k8s tenemos una separación de carpetas por ambiente (dev y prod).
- Para tener una base de como va a funcionar a futuro, estamos creando como una matriz donde podemos definir distintas cosas para cada uno.
- Algunas cosas pueden ir del lado del repositorio, como por ejemplo el Dockerfile. El Dockerfile podría ser de uso común.
- El config map podría ser uno de uso comun y de pronto modificarlo en el transcurso.



Lo que se ha hecho hasta ahora es lograr un deployment completo desde que hacemos un push al repositorio, hacemos un PR, y que se elaboren todos los jobs dentro del workflow.
- La idea es que desde el microservicio tenemos un solo template que...

Asi es como luce el gha: 
```yml
name: 'CD/CI Build Application GKE'
on:
  workflow_call:
    #inputs:
    #  token:
    #    type: string
    #    description: "GitHub Token"
    #    required: true    
    secrets:
      token:
        required: false
env:
  #### ESTAS SON VARIABLES GLOBALES
  PROJECT_ID: ${{ vars.PROJECT_ID }}
  APP: ${{ github.event.repository.name }}
  GHA_TOKEN: ${{ secrets.GHA_TOKEN }}
  GKE_CLUSTER: ${{ vars.GKE_CLUSTER }}

  ##### PARA FORMAR EL CONFIG MAP SE USA EL PREFIJO K8S_ AL INICIO DE LA APP 
  ####  PERO EL RESULTADO FINAL ES EL NOMBRE ORIGINAL DECLARADO EN EL CODIGO

  K8S_DEFAULT_LANG: ${{ vars.DEFAULT_LANG }}
  K8S_MONGO_DEBUG: ${{ vars.K8S_MONGO_DEBUG }}
  K8S_MONGO_DEBUG_INDENT: ${{ vars.K8S_MONGO_DEBUG_INDENT }}
  K8S_API_URL_DEBUG: ${{ vars.K8S_API_URL_DEBUG }}
  K8S_API_URL_PRICE: ${{ vars.K8S_API_URL_PRICE }}
  K8S_ALGOLIA_APPID: ${{ vars.K8S_ALGOLIA_APPID }}
  K8S_ALGOLIA_APIKEY: ${{ vars.K8S_ALGOLIA_APIKEY }}
  K8S_ALGOLIA_INDEX: ${{ vars.K8S_ALGOLIA_INDEX }}
  K8S_CACHE_TYPE: ${{ vars.K8S_CACHE_TYPE }}
  K8S_CACHE_URI: ${{ vars.K8S_CACHE_URI }}
  K8S_SWAGGER_ENABLED: ${{ vars.K8S_SWAGGER_ENABLED }}
  K8S_SWAGGER_PATH: ${{ vars.K8S_SWAGGER_PATH }}
  K8S_SWAGGER_TITLE: ${{ vars.K8S_SWAGGER_TITLE }}
  K8S_SWAGGER_DESCRIPTION: ${{ vars.K8S_SWAGGER_DESCRIPTION }}
  K8S_SWAGGER_VERSION: ${{ vars.K8S_SWAGGER_VERSION }}
  K8S_SWAGGER_CONTACT_NAME: ${{ vars.K8S_SWAGGER_CONTACT_NAME }}
  K8S_SWAGGER_CONTACT_URL: ${{ vars.K8S_SWAGGER_CONTACT_URL }}
  K8S_SWAGGER_CONTACT_MAIL: ${{ vars.K8S_SWAGGER_CONTACT_MAIL }}
  ### Configurando distintos recursos por ambiente en distintas APIs
  CPU_LIMIT: ${{ vars.CPU_LIMIT }}
  MEMORY_LIMIT: ${{ vars.MEMORY_LIMIT }}
  CPU_REQUEST: ${{ vars.CPU_REQUEST }}
  MEMORY_REQUEST: ${{ vars.MEMORY_REQUEST }}
  

jobs:
  # Job to create injectable configuration for nested jobs
  loadEnvs:
    permissions:
      contents: read
      pull-requests: write
      id-token: write      
    name: 'Loading envs and configurations'
    runs-on: ubuntu-latest
    env:
      module_name: "k8s"
    strategy:
      fail-fast: true
    outputs:
      env: ${{ steps.set-envs.outputs.matrix_envs }}
      module_name: "${{ env.module_name }}"
    steps:
      - name: Checkout Main Repo
        uses: actions/checkout@v4      
      # - name: Checkout Remote Repo
      #   uses: actions/checkout@v4
      #   with:
      #     repository: developer-implementos/devops-deploy-core
      #     ref: develop
      #     token: ${{ secrets.token }}
      #     path: devops-deploy-core
      # Create a JSON output to be used as a matrix to determine on which envs run the action
      - id: set-envs
        name: identify module envs
        run: |
          ls -lt          
          git clone https://devopsimplementos:$GHA_TOKEN@github.com/developer-implementos/devops-deploy-core.git             
          cd devops-deploy-core/${{ env.module_name }}
          envs=$( find . -maxdepth 1 -type d | cut -c 3-)
          module_envs=$(for i in $envs; do echo $i; done | jq -R . | jq -s -c .)
          echo "matrix_envs=${module_envs}" >> $GITHUB_OUTPUT
  test:
    runs-on: ubuntu-latest
    needs: loadEnvs
    strategy:
      fail-fast: false
      matrix:
        env: "${{fromJSON(needs.loadEnvs.outputs.env)}}"
    defaults:
      run:
        shell: bash
        #working-directory: k8s/${{ matrix.env }}
    environment:
      name: "${{ matrix.env }}"
    steps:
      - uses: actions/checkout@v4
      - name: Clone Project && Build the Docker image
        run: |
          echo 'Inician la pruebas de la APP'


  build:
    needs: [test,loadEnvs]
    #if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        env: "${{fromJSON(needs.loadEnvs.outputs.env)}}"
    defaults:
      run:
        shell: bash
        #working-directory: k8s/${{ matrix.env }}
    environment:
      name: "${{ matrix.env }}"
    env:
      REPOSITORY: ${{ vars.REPOSITORY }}
      GAR_LOCATION: ${{ vars.GKE_ZONE }}
      IMAGE_TAG: ${{ github.sha }}
      ENV: ${{ matrix.env }}
      PROJECT_ID: ${{ vars.PROJECT_ID }}

    steps:
      - uses: actions/checkout@v4
      
      - id: 'auth'
        name: 'Authenticate to Google Cloud'
        uses: 'google-github-actions/auth@v1'
        with:
          create_credentials_file: true
          token_format: access_token
          workload_identity_provider: ${{ secrets.WIP }}
          service_account: 'github-actions@onmichannel-common.iam.gserviceaccount.com'
          access_token_lifetime: 300s

      - name: Login to Artifact Registry
        uses: docker/login-action@v1
        with:
          registry: ${{ env.GAR_LOCATION }}-docker.pkg.dev
          username: oauth2accesstoken
          password: ${{ steps.auth.outputs.access_token }}

      - name: Get tag
        id: get-tag
        run: echo "short_ref=${GITHUB_REF#refs/*/}" >> $GITHUB_OUTPUT

      # Build the Docker image
      # - name: Build
      #   run: |-
      #     echo "${{ matrix.env }}"  "este es el environment"
      #     ls -lta

      #     docker build -t $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$IMAGE_TAG-${{ matrix.env }} .
      #     docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG-${{ matrix.env }}
      #     # docker build \ 
      #     #   --tag "$GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$APP:$GITHUB_SHA" \
      #     #   --build-arg GITHUB_SHA="$GITHUB_SHA" \
      #     #   --build-arg GITHUB_REF="$GITHUB_REF" \        

      - id: docker-push-tagged
        name: Tag Docker image and push to Google Artifact Registry
        uses: docker/build-push-action@v2
        with:
          push: true
          tags: |
             ${{ env.GAR_LOCATION }}-docker.pkg.dev/${{ env.PROJECT_ID }}/${{ env.REPOSITORY }}/${{ env.APP }}:${{ github.sha }}-${{ env.ENV }}
# southamerica-west1-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$APP:$ENV
             
            
# $GAR_LOCATION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY/$APP:latest
# ${{ steps.get-tag.outputs.short_ref }}
  deploy:
    needs: [build,loadEnvs]
    #if:  contains(github.event.comment.body, '/deploy-dev')
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        env: ['dev']
        #"${{fromJSON(needs.loadEnvs.outputs.env)}}"
    defaults:
      run:
        shell: bash
    environment:
      name: "${{ matrix.env }}"
    steps:
      - uses: actions/checkout@v4      
      - id: 'auth'
        name: 'Authenticate to Google Cloud'
        uses: 'google-github-actions/auth@v1'
        with:
          create_credentials_file: true
          token_format: access_token
          workload_identity_provider: ${{ secrets.WIP }}
          service_account: 'github-actions@onmichannel-common.iam.gserviceaccount.com'
          access_token_lifetime: 300s

      - name: Set up GKE credentials
        uses: google-github-actions/get-gke-credentials@v0
        with:
          cluster_name: ${{ vars.GKE_CLUSTER }}             
          location: ${{ vars.GKE_ZONE }}
          project_id: ${{ vars.PROJECT_ID }}

      - name: GKE Apply
        working-directory: ./

        run: |
          ls -lta
          set -x
          git clone https://devopsimplementos:$GHA_TOKEN@github.com/developer-implementos/devops-deploy-core.git   
          cd devops-deploy-core
          # git checkout develop          
          ls -lta
          cd k8s/${{ matrix.env }}

          VERSION=$GITHUB_SHA
          DEPLOY_DIR="../../"
          
          find $DEPLOY_DIR -type f -exec sed -i 's/\${CPU_LIMIT}/'"$CPU_LIMIT"'/g' {} \;
          find $DEPLOY_DIR -type f -exec sed -i 's/\${MEMORY_LIMIT}/'"$MEMORY_LIMIT"'/g' {} \;
          find $DEPLOY_DIR -type f -exec sed -i 's/\${CPU_REQUEST}/'"$CPU_REQUEST"'/g' {} \;
          find $DEPLOY_DIR -type f -exec sed -i 's/\${MEMORY_REQUEST}/'"$MEMORY_REQUEST"'/g' {} \;



          export IMAGE_K8S="southamerica-west1-docker.pkg.dev/$PROJECT_ID/implementos-docker-repo/$APP:${{ github.sha }}-${{ matrix.env }}"
          sed -i 's#_IMAGE_#'"$IMAGE_K8S"'#g'  ../deployment.yaml
          sed -i 's/\${RELEASE_VERSION}/'"$VERSION"'/g' ../deployment.yaml
          sed -i 's/\${ENV}/'"${{ matrix.env }}"'/g' ../deployment.yaml
          sed -i 's/\${APP}/'"$APP"'/g' ../deployment.yaml
          sed -i 's/\${ENV}/'"${{ matrix.env }}"'/g' ../service.yaml
          sed -i 's/\${APP}/'"$APP"'/g' ../service.yaml
          
          # sed -i 's/\${APP}/'"$APP"'/g' ../${{ matrix.env }}/configmap.yaml
          kubectl config get-contexts

          kubectl apply \
          --namespace=default \
          -f  ../deployment.yaml \
          -f  ../service.yaml 

          cd ../../
          ls -lta tools
          #sudo apt install python -y
          cp tools/envs2configmap.py .
          ls -tla
          

          echo "VARIABLES DE ENTORNO FROM GITHUB_ENV "
          echo "-------------------------------------------------------------------------------------------------------------------------"
          echo    $GITHUB_ENV
          echo "-------------------------------------------------------------------------------------------------------------------------"



          echo "VARIABLES DE ENTORNO DE FROM PRINTENV"
          printenv 


          python3 envs2configmap.py
          cat configmap.yaml
          kubectl apply -f configmap.yaml



          #-f k8s/${{ matrix.env }}/configmap.yaml

  deploy-prod:
      needs: [build,loadEnvs]
      if: contains(github.event.comment.body, '/deploy-prod')
      runs-on: ubuntu-latest
      strategy:
        fail-fast: false
        matrix:
          env: ['prod']
          #"${{fromJSON(needs.loadEnvs.outputs.env)}}"
      defaults:
        run:
          shell: bash
      environment:
        name: "${{ matrix.env }}"
      steps:
        - uses: actions/checkout@v4      
        - id: 'auth'
          name: 'Authenticate to Google Cloud'
          uses: 'google-github-actions/auth@v1'
          with:
            create_credentials_file: true
            token_format: access_token
            workload_identity_provider: ${{ secrets.WIP }}
            service_account: 'github-actions@onmichannel-common.iam.gserviceaccount.com'
            access_token_lifetime: 300s
  
        - name: Set up GKE credentials
          uses: google-github-actions/get-gke-credentials@v0
          with:
            cluster_name: ${{ vars.GKE_CLUSTER }}             
            location: ${{ vars.GKE_ZONE }}
            project_id: ${{ vars.PROJECT_ID }}
  
        - name: GKE Apply
          working-directory: ./
  
          run: |
            ls -lta
            set -x
            git clone https://devopsimplementos:$GHA_TOKEN@github.com/developer-implementos/devops-deploy-core.git   
            cd devops-deploy-core
            # git checkout develop          
            ls -lta
            cd k8s/${{ matrix.env }}
  
            VERSION=$GITHUB_SHA
  
  
       
            
       
            
            DEPLOY_DIR="../../"
            
            find $DEPLOY_DIR -type f -exec sed -i 's/\${CPU_LIMIT}/'"$CPU_LIMIT"'/g' {} \;
            find $DEPLOY_DIR -type f -exec sed -i 's/\${MEMORY_LIMIT}/'"$MEMORY_LIMIT"'/g' {} \;
            find $DEPLOY_DIR -type f -exec sed -i 's/\${CPU_REQUEST}/'"$CPU_REQUEST"'/g' {} \;
            find $DEPLOY_DIR -type f -exec sed -i 's/\${MEMORY_REQUEST}/'"$MEMORY_REQUEST"'/g' {} \;
  
  
  
            export IMAGE_K8S="southamerica-west1-docker.pkg.dev/$PROJECT_ID/implementos-docker-repo/$APP:${{ github.sha }}-${{ matrix.env }}"
            sed -i 's#_IMAGE_#'"$IMAGE_K8S"'#g'  ../deployment.yaml
            sed -i 's/\${RELEASE_VERSION}/'"$VERSION"'/g' ../deployment.yaml
            sed -i 's/\${ENV}/'"${{ matrix.env }}"'/g' ../deployment.yaml
            sed -i 's/\${APP}/'"$APP"'/g' ../deployment.yaml
            sed -i 's/\${ENV}/'"${{ matrix.env }}"'/g' ../service.yaml
            sed -i 's/\${APP}/'"$APP"'/g' ../service.yaml
            
            # sed -i 's/\${APP}/'"$APP"'/g' ../${{ matrix.env }}/configmap.yaml
            kubectl config get-contexts
  
            kubectl apply \
            --namespace=default \
            -f  ../deployment.yaml \
            -f  ../service.yaml 
  
            cd ../../
            ls -lta tools
            #sudo apt install python -y
            cp tools/envs2configmap.py .
            ls -tla
            
  
            echo "VARIABLES DE ENTORNO FROM GITHUB_ENV "
            echo "-------------------------------------------------------------------------------------------------------------------------"
            echo    $GITHUB_ENV
            echo "-------------------------------------------------------------------------------------------------------------------------"
  
  
  
            echo "VARIABLES DE ENTORNO DE FROM PRINTENV"
            printenv 
  
  
            python3 envs2configmap.py
            cat configmap.yaml
            kubectl apply -f configmap.yaml
```
- Llama a ese repositorio centralizado. Vamos a guardar todas las configuraciones e incluso si tenemos cosas especificas podemos añadir la rama como tal. La idea es que siempre vaya en main y que sea como los ultimos cambios.
- Así es como se ve mas o menos el workflow:

<img src="./assets/deployment-workflow.png">
Paso 1:
- Primero que todo se leen algunas variables y se trae el template, aqui se hace la autenticación para conectarse al otro repo.
Paso 2:
- No tenemos tests, solo esta ahi para construirlo.
Paso 3:
- Aqui hacemos los builds para el registry. Hemos creado un artifact para registry donde vamos a estar almacenando las imagenes. 
- Ya esta la autenticación hecha para que desde el gha se conecte con el workflow id provider, es como una sugerencia en cuanto a seguridad.



