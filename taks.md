preciso pegar o xml que vem do pdv, das vendas em contigencia, transformar de 55 para m65
e ficar rodando de forma automatica, validando o motivo da rejeição
eu tenho duas tabelas para utilizar e verificar, no banco
tabela de VENDA E NOTA_FISCAL_SITUACAO
venda que cstat <> 100


query para validar as vendas em contigência

SELECT
	CASE
		WHEN B.XML_EVENTO IS NOT NULL THEN BASE64_DECODE(B.XML_EVENTO) 
		WHEN B.XML_NOTA IS NOT NULL THEN BASE64_DECODE(B.XML_NOTA) 
		WHEN C.XML IS NOT NULL THEN BASE64_DECODE(C.XML) 
		ELSE 'N/A'
	END AS XML,
	B.*
FROM
	VENDA A
INNER JOIN NOTA_FISCAL_SITUACAO B ON 
	A.IDVENDA = B.IDVENDA
INNER JOIN VENDAXML C ON 
	B.IDVENDA = C.IDVENDA 
WHERE 
	A.STCANCELADO = 'False'
	AND B.CSTAT <> 100
;

query para trazer o xml formatado
SELECT
    BASE64_DECODE(A.XML) AS "XML"
FROM VENDAXML A
LIMIT 1;

preciso criar uma automação em node js,
para tentar ficar reeviando as notas em contigencia da sefaz
eu já tenho api que pega os dados e xml no hana,
meu código node recebe este xml e fica tentando reenviar para a sefaz
transformando de 55 para 65.