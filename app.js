// Ponto de entrada principal para servidores cPanel / Passenger (Apache)
// Passenger vai injetar a variável process.env.PORT automaticamente.
require('./dist/server.cjs');
