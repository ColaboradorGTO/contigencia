import { Router } from 'express';
import ConsultaNfeController from './Informatica/ConsultaNFCE/controllers/consulta.js'
import ConsultaNFceController  from './Informatica/ConsultaNFCE/controllers/index.js'
import ConsultaNFeController from './Informatica/ConsultaNFCE/controllers/nfe.js'
import ConsultaStatusNfeController from './Informatica/ConsultaNFCE/controllers/statusNfce.js'


const routes = new Router();
// routes.use(authMiddleware)

routes.get('/', (req, res) => {
    res.send('Hello World! Myltiane');
});



routes.get('/valida-venda-contingencia', ConsultaNfeController.validarStatusSefaz);
routes.put('/valida-venda-contingencia/:id', ConsultaNfeController.putValidarVendaContigencia);
routes.get('/status-sefaz', ConsultaStatusNfeController.statusSefaz);
routes.post('/consultar-nfce', ConsultaNFceController.consultaNFce);
routes.post('/downloadXML', ConsultaStatusNfeController.downloadNFE);
routes.post('/cancelar-nfe', ConsultaStatusNfeController.cancelarNFE);
routes.post('/inutilizar-nfe', ConsultaStatusNfeController.inutilizarNFE);
routes.get('/validarConsulta', ConsultaStatusNfeController.validarConsulta);
routes.post('/consultar-nfe', ConsultaNFeController.consultaNFe);


export default routes;

