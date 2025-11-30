const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// Carrega arquivo .proto
const reviewsProtoDefinition = protoLoader.loadSync('proto/review.proto', {
    keepCase: true,
    longs: String,
    enums: String,
    arrays: true,
});

const reviewsPackageDefinition = grpc.loadPackageDefinition(reviewsProtoDefinition);

// Array para armazenar as avaliações (em um sistema real, seria um banco de dados)
const reviewsData = [];

// Implementação do serviço
const server = new grpc.Server();

server.addService(reviewsPackageDefinition.ReviewService.service, {
    // Retorna todas as avaliações de um produto
    GetReviews: (call, callback) => {
        const productId = call.request.id;
        const productReviews = reviewsData.filter((review) => review.productId == productId);
        callback(null, { reviews: productReviews });
    },

    // Adiciona uma nova avaliação
    AddReview: (call, callback) => {
        const review = call.request;

        // Adiciona a data atual à avaliação
        review.date = new Date().toISOString();

        // Adiciona a avaliação ao array
        reviewsData.push(review);

        callback(null, {
            success: true,
            message: 'Avaliação adicionada com sucesso!',
        });
    },
});

// Inicia o servidor na porta 3003
server.bindAsync('0.0.0.0:3003', grpc.ServerCredentials.createInsecure(), (error, port) => {
    console.log('Reviews Service running at http://127.0.0.1:3003');
});