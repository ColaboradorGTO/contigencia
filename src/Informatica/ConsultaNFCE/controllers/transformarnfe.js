import { Make, Tools, docZip } from 'node-sped-nfe';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import os from 'os';
import https from 'https';
import 'dotenv/config';
const url = process.env.API_URL

// IMPORTANTE: Desabilitar rejeição de certificado NO INÍCIO
// This is for internal SEFAZ calls que possuem certificado auto-assinado
// Suprimir aviso de NODE_TLS_REJECT_UNAUTHORIZED interceptando stderr
const originalStderr = process.stderr.write;
process.stderr.write = function (chunk, encoding, callback) {
    const message = chunk.toString();
    if (message.includes('NODE_TLS_REJECT_UNAUTHORIZED')) {
        return callback ? callback() : true;
    }
    return originalStderr.call(process.stderr, chunk, encoding, callback);
};

process.on('warning', (warning) => {
    if (warning.code === 'NODE_TLS_REJECT_UNAUTHORIZED') {
        return;
    }
    console.warn(warning);
});

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Criar HTTPS Agent global que desabilita verificação de certificado
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    checkServerIdentity: () => undefined // Ignora validação de hostname
});

// Aplicar ao axios para HTTPS apenas
axios.defaults.httpsAgent = httpsAgent;

// Detectar SO e retornar extensão correta
const getToolPath = (basePath, executable) => {
    const isWindows = os.platform() === 'win32';

    if (!isWindows) {
        // Em Linux, tentar usar o executável do sistema primeiro
        try {
            const systemPath = `/usr/bin/${executable}`;
            if (fs.existsSync(systemPath)) {
                return systemPath;
            }
        } catch (e) { }
    }

    // Caso contrário, usar o caminho local
    const ext = isWindows ? '.exe' : '';
    return path.resolve(`${basePath}${executable}${ext}`);
};

export async function getCertOptions(senha, fallbackPfxPath = './GTO COMERCIO 2026-2027.pfx') {
    // -----------------------------
    // 1) PFX BASE64 VIA ENV
    // -----------------------------
    if (process.env.CERT_PFX_BASE64) {
        try {
            const buf = Buffer.from(process.env.CERT_PFX_BASE64, "base64");
            if (buf.length > 0) {
                return { pfx: buf, senha };
            }
        } catch (e) {
            console.error("ERRO: CERT_PFX_BASE64 inválido:", e.message);
        }
    }

    // -----------------------------
    // 2) PFX ARQUIVO LOCAL
    // -----------------------------
    if (fallbackPfxPath && fs.existsSync(fallbackPfxPath)) {
        try {
            const buf = fs.readFileSync(path.resolve(fallbackPfxPath));
            if (buf.length > 0) {
                return { pfx: buf, senha };
            }
        } catch (e) {
            console.error("ERRO ao ler arquivo PFX local:", e.message);
        }
    }

    // -----------------------------
    // 3) PEM BASE64 (cert + key)
    // -----------------------------
    if (process.env.CERT_PEM_CERT_BASE64 && process.env.CERT_PEM_KEY_BASE64) {
        try {
            const cert = Buffer.from(process.env.CERT_PEM_CERT_BASE64, "base64");
            const key = Buffer.from(process.env.CERT_PEM_KEY_BASE64, "base64");
            return { cert, key };
        } catch (e) {
            console.error("ERRO: CERT_PEM_*_BASE64 inválido:", e.message);
        }
    }
    return null;
}


class TransformarNotaController {
    async transformar(req, res) {
        try {
            let { vendas } = req.body;
            let { idVenda, page, pageSize } = req.query;
            
            if(!vendas) {
                idVenda = idVenda ? idVenda : '';
                page = page ? page : '';
                pageSize = pageSize ? pageSize : '';
    
                const apiUrl = `http://164.152.245.77:8000/quality/concentrador_homologacao/api/venda/atualizar-venda-contigencia-55-65.xsjs?idVenda=${idVenda}&page${page}&pageSize=${pageSize}`;
                const response = await axios.get(apiUrl);
                vendas = response.data;

            }

                 if (!Array.isArray(vendas)) {
        if (Array.isArray(vendas.data)) {
          vendas = vendas.data;
        } else if (Array.isArray(vendas.rows)) {
          vendas = vendas.rows;
        } else if (vendas.data && Array.isArray(vendas.data.rows)) {
          vendas = vendas.data.rows;
        } else {
          // tenta encontrar a primeira propriedade que é array
          const possibleArray = Object.values(vendas).find(v => Array.isArray(v));
          if (Array.isArray(possibleArray)) {
            vendas = possibleArray;
          }
        }
      }

      if (!Array.isArray(vendas) || vendas.length === 0) {
        return res.status(400).json({ error: "Nenhuma venda para consultar." });
      }

      const resultados = [];

            for (const row of vendas) {
                const IDVENDA = String(row.IDVENDA ?? "").trim();
                const UF = String(row.NFE_INFNFE_EMIT_ENDEREMIT_UF ?? "").trim();
                const CHAVE = String(row.CHAVE ?? "").trim();
                const cscId = row.IDTOKEN || "1";
                const csc = row.TOKENCSC || "";
                const mod = String(row.MODELO || "65");
                const tpAmb = parseInt(row.AMBIENTE || 1);
                const SENHA_CERT = process.env.SENHA || "#GTO@2026#";
             
                const certOptions = await getCertOptions(SENHA_CERT, path.resolve("./GTO COMERCIO 2026-2027.pfx"));
               
                if (!CHAVE) {
                    resultados.push({ IDVENDA, UF, error: "CHAVE ausente" });
                    continue;
                }
                if (!certOptions) {
                    return res.status(500).json({
                        error: 'Não foi possível carregar o certificado. Verifique as variáveis de ambiente ou o arquivo local.'
                    });
                }
                
                // Apenas definir OPENSSL_MODULES em Windows
                if (os.platform() === 'win32') {
                    const opensslModulesPath = path.resolve("./libs/openssl/lib/ossl-modules");
                    process.env.OPENSSL_MODULES = opensslModulesPath;
                } else {
                    // Em Linux, não usar módulos legados
                    delete process.env.OPENSSL_MODULES;
                }
                
                try {
                    const toolsConfig = {
                        mod: mod,
                        tpAmb: tpAmb,
                        UF: UF,
                        versao: "4.00",
                        CSC: csc,
                        CSCid: cscId,
                    }
                    
                    
                    
                    if (os.platform() === 'win32') {
                        toolsConfig.xmllint = getToolPath('./libs/libxml/bin/', 'xmllint');
                        toolsConfig.openssl = getToolPath('./libs/openssl/bin/', 'openssl');
                    }
                    const tools = new Tools(toolsConfig, certOptions);
                    // console.log(toolsConfig, 'tools')
                    // console.log(certOptions, 'certOptions')
                    console.log(tools, 'tools')
                    // const resposta = await tools.sefazStatus(CHAVE);
                    const resposta = await tools.consultarNFe(CHAVE);
                    
                    const xml = resposta ?? null;
                    const cstat =
                        resposta?.retConsSitNFe?.cStat ??
                        (xml?.match(/<cStat>(\d+)<\/cStat>/)?.[1] ?? null);
                    console.log(cstat, 'cstat')
                    resultados.push({ IDVENDA, UF, CHAVE, CSTAT: cstat, mod, tpAmb, XML: xml });
                } catch (e) {
                    resultados.push({ IDVENDA, UF, CHAVE, error: e.message });
                }
            }
            // console.log(response.data[0], 'venda')

             return res.json({
        total: resultados.length,
        processados: resultados.filter((r) => !r.error).length,
        data: resultados,
      });
        } catch (err) {
            return res.status(500).json({ error: err.message });
        }
    }

}

export default new TransformarNotaController();