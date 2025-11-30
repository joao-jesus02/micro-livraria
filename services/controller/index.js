const express = require('express');
const shipping = require('./shipping');
const inventory = require('./inventory');
const reviews = require('./review')
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Retorna a lista de produtos da loja via InventoryService
 */
app.get('/products', (req, res, next) => {
    inventory.SearchAllProducts(null, (err, data) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'something failed :(' });
        } else {
            res.json(data.products);
        }
    }); 
});


/**
 * Consulta o frete de envio no ShippingService
 */
app.get('/shipping/:cep', (req, res, next) => {
    shipping.GetShippingRate(
        {
            cep: req.params.cep,
        },
        (err, data) => {
            if (err) {
                console.error(err);
                res.status(500).send({ error: 'something failed :(' });
            } else {
                res.json({
                    cep: req.params.cep,
                    value: data.value,
                });
            }
        }
    );
});

app.get('/product/:id', (req, res, next) => {
    // Chama método do microsserviço.
    inventory.SearchProductByID({ id: req.params.id }, (err, product) => {
        // Se ocorrer algum erro de comunicação
        // com o microsserviço, retorna para o navegador.
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'something failed :(' });
        } else {
            // Caso contrário, retorna resultado do
            // microsserviço (um arquivo JSON) com os dados
            // do produto pesquisado
            res.json(product);
        }
    });
});

// Rota para obter avaliações de um produto
app.get('/reviews/:id', (req, res, next) => {
    reviews.GetReviews({ id: req.params.id }, (err, reviewsData) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'Falha ao recuperar avaliações' });
        } else {
            res.json(reviewsData);
        }
    });
});

// Rota para adicionar uma nova avaliação
app.post('/reviews', (req, res, next) => {
    const review = {
        productId: req.body.productId,
        username: req.body.username,
        rating: req.body.rating,
        comment: req.body.comment,
    };

    reviews.AddReview(review, (err, response) => {
        if (err) {
            console.error(err);
            res.status(500).send({ error: 'Falha ao adicionar avaliação' });
        } else {
            res.json(response);
        }
    });
});

/**
 * Inicia o router
 */
app.listen(3000, () => {
    console.log('Controller Service running on http://127.0.0.1:3000');
});
