const fs = require("fs");

global.window = {};
require("../src/establishments.generated.js");

const rows = window.DatacoraEstablishments.filter((establishment) => (
  !Number.isFinite(establishment.coordinates?.lat)
  || !Number.isFinite(establishment.coordinates?.lng)
));

const headers = ["rbd", "nombre", "comuna", "direccion", "sucursal", "latitud", "longitud"];
const quote = String.fromCharCode(34);
const escapeCsv = (value) => `${quote}${String(value ?? "").replaceAll(quote, quote + quote)}${quote}`;

const csv = "\ufeff" + [
  headers.join(","),
  ...rows.map((establishment) => [
    establishment.rbd,
    establishment.name,
    establishment.comuna,
    establishment.address,
    establishment.branch,
    establishment.coordinates?.lat ?? "",
    establishment.coordinates?.lng ?? ""
  ].map(escapeCsv).join(","))
].join("\r\n");

fs.writeFileSync("rbd_sin_coordenadas.csv", csv, "utf8");
console.log(`Archivo creado: rbd_sin_coordenadas.csv`);
console.log(`Registros: ${rows.length}`);
