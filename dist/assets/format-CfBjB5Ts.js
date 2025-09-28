const n=new Intl.NumberFormat("ru-RU",{style:"currency",currency:"EUR",maximumFractionDigits:2});function t(r){return r==null||isNaN(Number(r))?"€0.00":n.format(Number(r))}export{t as f};
