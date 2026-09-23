// Genera db/migrations/0002_catalog.sql a partir de esta lista.
// IVA de referencia por categoría (España, 2026). El albarán manda: si no coincide, la app pregunta.
import { writeFileSync } from 'node:fs';
const here = new URL('..', import.meta.url).pathname;

const CATS = [
  ['verdura', 'Verduras y hortalizas', 'verdura', 4, 'cocina'],
  ['fruta', 'Frutas', 'fruta', 4, 'cocina'],
  ['huevos', 'Huevos', 'huevo', 4, 'cocina'],
  ['leche_queso', 'Leche y quesos', 'leche o queso', 4, 'cocina'],
  ['pan_harina', 'Pan y harinas', 'pan o harina', 4, 'cocina'],
  ['legumbre_cereal', 'Legumbres, arroces y cereales', 'legumbre o cereal', 4, 'cocina'],
  ['aceite_oliva', 'Aceites de oliva', 'aceite de oliva', 4, 'cocina'],
  ['carne', 'Carnes y aves', 'carne', 10, 'cocina'],
  ['pescado', 'Pescados y mariscos', 'pescado o marisco', 10, 'cocina'],
  ['charcuteria', 'Embutidos y charcutería', 'embutido', 10, 'cocina'],
  ['lacteo', 'Lácteos y derivados', 'derivado lácteo', 10, 'cocina'],
  ['pasta', 'Pastas', 'pasta', 10, 'cocina'],
  ['aceite_otro', 'Otros aceites y grasas', 'aceite o grasa', 10, 'cocina'],
  ['conserva', 'Conservas', 'conserva', 10, 'cocina'],
  ['condimento', 'Condimentos, especias y vinagres', 'condimento', 10, 'cocina'],
  ['salsa', 'Salsas y preparados', 'salsa o preparado', 10, 'cocina'],
  ['reposteria', 'Azúcar, frutos secos y repostería', 'producto de repostería', 10, 'cocina'],
  ['congelado', 'Congelados', 'congelado', 10, 'cocina'],
  ['cafe', 'Café e infusiones', 'café o infusión', 10, 'bebida'],
  ['bebida', 'Aguas, refrescos y zumos', 'bebida sin alcohol', 10, 'bebida'],
  ['cerveza', 'Cervezas', 'cerveza', 21, 'bebida'],
  ['vino', 'Vinos, cavas y sidras', 'vino', 21, 'bebida'],
  ['licor', 'Licores y destilados', 'licor', 21, 'bebida'],
  ['limpieza', 'Limpieza y desechables', 'producto de limpieza', 21, 'otros'],
  ['otros', 'Otros', 'producto', 10, 'otros'],
];

// [id, nombre, categoría, unidad, rendimiento %, alias...]
const ITEMS = [
  // Verduras y hortalizas
  ['tomate-pera', 'Tomate pera', 'verdura', 'kg', 95, 'tomate'], ['tomate-rama', 'Tomate en rama', 'verdura', 'kg', 95], ['tomate-cherry', 'Tomate cherry', 'verdura', 'kg', 98],
  ['tomate-raf', 'Tomate raf', 'verdura', 'kg', 95], ['cebolla', 'Cebolla', 'verdura', 'kg', 90], ['cebolla-dulce', 'Cebolla dulce', 'verdura', 'kg', 90, 'cebolla fuentes'],
  ['cebolla-morada', 'Cebolla morada', 'verdura', 'kg', 90], ['cebolleta', 'Cebolleta', 'verdura', 'kg', 80], ['ajo', 'Ajo', 'verdura', 'kg', 85, 'ajos'],
  ['puerro', 'Puerro', 'verdura', 'kg', 70], ['zanahoria', 'Zanahoria', 'verdura', 'kg', 90], ['patata', 'Patata', 'verdura', 'kg', 85, 'patatas'],
  ['patata-agria', 'Patata agria', 'verdura', 'kg', 85], ['patata-nueva', 'Patata nueva', 'verdura', 'kg', 90], ['boniato', 'Boniato', 'verdura', 'kg', 85],
  ['pimiento-rojo', 'Pimiento rojo', 'verdura', 'kg', 85], ['pimiento-verde', 'Pimiento verde', 'verdura', 'kg', 85], ['pimiento-italiano', 'Pimiento italiano', 'verdura', 'kg', 85],
  ['pimiento-padron', 'Pimiento de Padrón', 'verdura', 'kg', 98], ['calabacin', 'Calabacín', 'verdura', 'kg', 95], ['berenjena', 'Berenjena', 'verdura', 'kg', 90],
  ['calabaza', 'Calabaza', 'verdura', 'kg', 75], ['pepino', 'Pepino', 'verdura', 'kg', 90], ['lechuga-romana', 'Lechuga romana', 'verdura', 'ud', 85, 'romana'],
  ['lechuga-iceberg', 'Lechuga iceberg', 'verdura', 'ud', 85], ['lechuga-variada', 'Lechuga variada', 'verdura', 'kg', 95, 'mezclum', 'mix ensalada'], ['brotes-tiernos', 'Brotes tiernos', 'verdura', 'kg', 98, 'brotes'],
  ['rucula', 'Rúcula', 'verdura', 'kg', 95], ['canonigos', 'Canónigos', 'verdura', 'kg', 95], ['espinaca', 'Espinaca', 'verdura', 'kg', 85, 'espinaca baby'],
  ['acelga', 'Acelga', 'verdura', 'kg', 80], ['brocoli', 'Brócoli', 'verdura', 'kg', 65], ['coliflor', 'Coliflor', 'verdura', 'kg', 60],
  ['repollo', 'Repollo', 'verdura', 'kg', 85], ['col-lombarda', 'Col lombarda', 'verdura', 'kg', 85], ['alcachofa', 'Alcachofa', 'verdura', 'kg', 40],
  ['esparrago-verde', 'Espárrago verde', 'verdura', 'kg', 70, 'esparrago triguero'], ['judia-verde', 'Judía verde', 'verdura', 'kg', 90], ['guisante', 'Guisante', 'verdura', 'kg', 100],
  ['champinon', 'Champiñón', 'verdura', 'kg', 95], ['setas-variadas', 'Setas variadas', 'verdura', 'kg', 90], ['seta-shiitake', 'Seta shiitake', 'verdura', 'kg', 90],
  ['apio', 'Apio', 'verdura', 'kg', 75], ['hinojo', 'Hinojo', 'verdura', 'kg', 70], ['jengibre', 'Jengibre', 'verdura', 'kg', 85],
  ['perejil', 'Perejil', 'verdura', 'ud', 80, 'manojo perejil'], ['cilantro', 'Cilantro', 'verdura', 'ud', 80], ['albahaca', 'Albahaca', 'verdura', 'ud', 80],
  ['hierbabuena', 'Hierbabuena', 'verdura', 'ud', 80, 'menta'], ['cebollino', 'Cebollino', 'verdura', 'ud', 90], ['guindilla', 'Guindilla', 'verdura', 'kg', 95],
  // Frutas
  ['limon', 'Limón', 'fruta', 'kg', 100, 'limones'], ['lima', 'Lima', 'fruta', 'kg', 100], ['naranja', 'Naranja', 'fruta', 'kg', 100], ['naranja-zumo', 'Naranja de zumo', 'fruta', 'kg', 100],
  ['mandarina', 'Mandarina', 'fruta', 'kg', 100], ['manzana-golden', 'Manzana golden', 'fruta', 'kg', 85], ['manzana-reineta', 'Manzana reineta', 'fruta', 'kg', 85],
  ['pera', 'Pera conferencia', 'fruta', 'kg', 85], ['platano', 'Plátano de Canarias', 'fruta', 'kg', 70, 'platano'], ['fresa', 'Fresa', 'fruta', 'kg', 95],
  ['frambuesa', 'Frambuesa', 'fruta', 'kg', 100], ['arandano', 'Arándano', 'fruta', 'kg', 100], ['uva', 'Uva', 'fruta', 'kg', 95], ['melon', 'Melón', 'fruta', 'kg', 60],
  ['sandia', 'Sandía', 'fruta', 'kg', 55], ['pina', 'Piña', 'fruta', 'kg', 55], ['mango', 'Mango', 'fruta', 'kg', 70], ['kiwi', 'Kiwi', 'fruta', 'kg', 85],
  ['aguacate', 'Aguacate', 'fruta', 'kg', 70], ['melocoton', 'Melocotón', 'fruta', 'kg', 85], ['higo', 'Higo', 'fruta', 'kg', 95], ['granada', 'Granada', 'fruta', 'kg', 55],
  // Huevos
  ['huevo-campero-l', 'Huevo campero L', 'huevos', 'ud', 100, 'huevos camperos', 'huevo l'], ['huevo-m', 'Huevo M', 'huevos', 'ud', 100, 'huevos m'], ['huevo-codorniz', 'Huevo de codorniz', 'huevos', 'ud', 100],
  ['huevo-liquido', 'Huevo líquido pasteurizado', 'huevos', 'L', 100, 'huevo liquido'],
  // Leche y quesos
  ['leche-entera', 'Leche entera', 'leche_queso', 'L', 100], ['leche-semi', 'Leche semidesnatada', 'leche_queso', 'L', 100], ['queso-manchego', 'Queso manchego curado', 'leche_queso', 'kg', 92, 'manchego'],
  ['queso-semicurado', 'Queso semicurado', 'leche_queso', 'kg', 95], ['queso-cabra', 'Queso de cabra en rulo', 'leche_queso', 'kg', 95, 'rulo de cabra'], ['mozzarella', 'Mozzarella', 'leche_queso', 'kg', 100],
  ['burrata', 'Burrata', 'leche_queso', 'ud', 100], ['parmesano', 'Queso parmesano', 'leche_queso', 'kg', 95, 'grana padano'], ['queso-azul', 'Queso azul', 'leche_queso', 'kg', 95],
  ['queso-crema', 'Queso crema', 'leche_queso', 'kg', 100], ['queso-rallado', 'Queso rallado', 'leche_queso', 'kg', 100],
  // Pan y harinas
  ['pan-barra', 'Pan de barra', 'pan_harina', 'ud', 100, 'barra de pan'], ['pan-hamburguesa', 'Pan de hamburguesa', 'pan_harina', 'ud', 100], ['pan-molde', 'Pan de molde', 'pan_harina', 'ud', 100],
  ['harina-trigo', 'Harina de trigo', 'pan_harina', 'kg', 100], ['harina-fuerza', 'Harina de fuerza', 'pan_harina', 'kg', 100],
  // Legumbres, arroces y cereales
  ['arroz-redondo', 'Arroz redondo', 'legumbre_cereal', 'kg', 100], ['arroz-bomba', 'Arroz bomba', 'legumbre_cereal', 'kg', 100], ['arroz-basmati', 'Arroz basmati', 'legumbre_cereal', 'kg', 100],
  ['garbanzo', 'Garbanzo', 'legumbre_cereal', 'kg', 100], ['lenteja', 'Lenteja', 'legumbre_cereal', 'kg', 100], ['alubia-blanca', 'Alubia blanca', 'legumbre_cereal', 'kg', 100],
  ['alubia-roja', 'Alubia roja', 'legumbre_cereal', 'kg', 100], ['quinoa', 'Quinoa', 'legumbre_cereal', 'kg', 100], ['copos-avena', 'Copos de avena', 'legumbre_cereal', 'kg', 100],
  // Aceites de oliva
  ['aceite-oliva-ve', 'Aceite de oliva virgen extra', 'aceite_oliva', 'L', 100, 'aove', 'aceite oliva v extra', 'aceite oliva virgen extra'], ['aceite-oliva-suave', 'Aceite de oliva suave', 'aceite_oliva', 'L', 100, 'aceite oliva 0.4'],
  ['aceite-orujo', 'Aceite de orujo de oliva', 'aceite_oliva', 'L', 100],
  // Carnes y aves
  ['pollo-entero', 'Pollo entero', 'carne', 'kg', 100], ['pechuga-pollo', 'Pechuga de pollo', 'carne', 'kg', 95], ['muslo-pollo', 'Muslo de pollo', 'carne', 'kg', 90],
  ['alitas-pollo', 'Alitas de pollo', 'carne', 'kg', 100], ['contramuslo-pollo', 'Contramuslo de pollo deshuesado', 'carne', 'kg', 95], ['pavo-pechuga', 'Pechuga de pavo', 'carne', 'kg', 95],
  ['solomillo-ternera', 'Solomillo de ternera', 'carne', 'kg', 85], ['entrecot', 'Entrecot de ternera', 'carne', 'kg', 90, 'lomo alto'], ['ternera-guisar', 'Ternera para guisar', 'carne', 'kg', 90, 'aguja', 'babilla'],
  ['carne-picada-ternera', 'Carne picada de ternera', 'carne', 'kg', 100], ['carrillera', 'Carrillera', 'carne', 'kg', 85], ['rabo-toro', 'Rabo de toro', 'carne', 'kg', 60],
  ['cordero-pierna', 'Pierna de cordero', 'carne', 'kg', 70], ['paletilla-cordero', 'Paletilla de cordero', 'carne', 'kg', 70], ['costilla-cerdo', 'Costilla de cerdo', 'carne', 'kg', 75],
  ['solomillo-cerdo', 'Solomillo de cerdo', 'carne', 'kg', 90], ['secreto-iberico', 'Secreto ibérico', 'carne', 'kg', 90], ['presa-iberica', 'Presa ibérica', 'carne', 'kg', 90],
  ['lomo-cerdo', 'Lomo de cerdo', 'carne', 'kg', 90], ['panceta', 'Panceta', 'carne', 'kg', 95], ['carne-picada-mixta', 'Carne picada mixta', 'carne', 'kg', 100],
  ['conejo', 'Conejo', 'carne', 'kg', 75], ['magret-pato', 'Magret de pato', 'carne', 'kg', 90], ['hamburguesa-ternera', 'Hamburguesa de ternera', 'carne', 'ud', 100],
  // Pescados y mariscos
  ['merluza', 'Merluza', 'pescado', 'kg', 60], ['bacalao-desalado', 'Bacalao desalado', 'pescado', 'kg', 85], ['bacalao-fresco', 'Bacalao fresco', 'pescado', 'kg', 65],
  ['salmon', 'Salmón', 'pescado', 'kg', 70], ['atun-rojo', 'Atún rojo', 'pescado', 'kg', 80], ['bonito', 'Bonito del norte', 'pescado', 'kg', 70],
  ['rape', 'Rape', 'pescado', 'kg', 45], ['dorada', 'Dorada', 'pescado', 'kg', 45], ['lubina', 'Lubina', 'pescado', 'kg', 45],
  ['sardina', 'Sardina', 'pescado', 'kg', 60], ['boqueron', 'Boquerón', 'pescado', 'kg', 60], ['calamar', 'Calamar', 'pescado', 'kg', 70],
  ['chipiron', 'Chipirón', 'pescado', 'kg', 75], ['sepia', 'Sepia', 'pescado', 'kg', 60], ['pulpo', 'Pulpo', 'pescado', 'kg', 50],
  ['gamba-roja', 'Gamba roja', 'pescado', 'kg', 50], ['gamba-blanca', 'Gamba blanca', 'pescado', 'kg', 50], ['langostino', 'Langostino', 'pescado', 'kg', 50],
  ['mejillon', 'Mejillón', 'pescado', 'kg', 35], ['almeja', 'Almeja', 'pescado', 'kg', 40], ['berberecho', 'Berberecho', 'pescado', 'kg', 35],
  ['navaja', 'Navaja', 'pescado', 'kg', 40], ['rodaballo', 'Rodaballo', 'pescado', 'kg', 45], ['pez-espada', 'Pez espada', 'pescado', 'kg', 85],
  // Embutidos y charcutería
  ['jamon-iberico', 'Jamón ibérico', 'charcuteria', 'kg', 100], ['jamon-serrano', 'Jamón serrano', 'charcuteria', 'kg', 100], ['chorizo', 'Chorizo', 'charcuteria', 'kg', 100],
  ['salchichon', 'Salchichón', 'charcuteria', 'kg', 100], ['lomo-embuchado', 'Lomo embuchado', 'charcuteria', 'kg', 100], ['morcilla', 'Morcilla', 'charcuteria', 'kg', 100],
  ['bacon', 'Beicon', 'charcuteria', 'kg', 100, 'bacon'], ['salchicha-fresca', 'Salchicha fresca', 'charcuteria', 'kg', 100], ['sobrasada', 'Sobrasada', 'charcuteria', 'kg', 100],
  ['jamon-cocido', 'Jamón cocido', 'charcuteria', 'kg', 100, 'jamon york'],
  // Lácteos y derivados
  ['nata-cocinar', 'Nata para cocinar', 'lacteo', 'L', 100], ['nata-montar', 'Nata para montar', 'lacteo', 'L', 100, 'nata 35'], ['mantequilla', 'Mantequilla', 'lacteo', 'kg', 100],
  ['yogur-natural', 'Yogur natural', 'lacteo', 'ud', 100], ['leche-condensada', 'Leche condensada', 'lacteo', 'kg', 100],
  // Pastas
  ['espagueti', 'Espagueti', 'pasta', 'kg', 100, 'spaghetti'], ['macarron', 'Macarrón', 'pasta', 'kg', 100], ['tallarin', 'Tallarín', 'pasta', 'kg', 100],
  ['lasana', 'Láminas de lasaña', 'pasta', 'kg', 100], ['pasta-rellena', 'Pasta fresca rellena', 'pasta', 'kg', 100, 'ravioli'], ['fideo', 'Fideo', 'pasta', 'kg', 100],
  // Otros aceites y grasas
  ['aceite-girasol', 'Aceite de girasol', 'aceite_otro', 'L', 100], ['aceite-girasol-ao', 'Aceite de girasol alto oleico', 'aceite_otro', 'L', 100, 'alto oleico'], ['margarina', 'Margarina', 'aceite_otro', 'kg', 100],
  // Conservas
  ['tomate-triturado', 'Tomate triturado', 'conserva', 'kg', 100], ['tomate-frito', 'Tomate frito', 'conserva', 'kg', 100], ['atun-aceite', 'Atún en aceite', 'conserva', 'kg', 75],
  ['anchoa', 'Anchoa en aceite', 'conserva', 'kg', 80], ['piquillo', 'Pimiento del piquillo', 'conserva', 'kg', 85], ['aceituna-verde', 'Aceituna verde', 'conserva', 'kg', 60],
  ['aceituna-negra', 'Aceituna negra', 'conserva', 'kg', 60], ['alcaparra', 'Alcaparra', 'conserva', 'kg', 70], ['garbanzo-cocido', 'Garbanzo cocido', 'conserva', 'kg', 65],
  ['maiz-dulce', 'Maíz dulce', 'conserva', 'kg', 65], ['esparrago-blanco', 'Espárrago blanco en conserva', 'conserva', 'kg', 60],
  // Condimentos, especias y vinagres
  ['sal-fina', 'Sal fina', 'condimento', 'kg', 100], ['sal-marina', 'Sal marina', 'condimento', 'kg', 100, 'sal gorda'], ['sal-escamas', 'Sal en escamas', 'condimento', 'kg', 100, 'maldon'],
  ['pimienta-negra', 'Pimienta negra', 'condimento', 'kg', 100], ['pimenton-dulce', 'Pimentón dulce', 'condimento', 'kg', 100], ['pimenton-picante', 'Pimentón picante', 'condimento', 'kg', 100],
  ['comino', 'Comino', 'condimento', 'kg', 100], ['oregano', 'Orégano', 'condimento', 'kg', 100], ['laurel', 'Laurel', 'condimento', 'kg', 100],
  ['tomillo', 'Tomillo', 'condimento', 'kg', 100], ['romero', 'Romero', 'condimento', 'kg', 100], ['canela', 'Canela', 'condimento', 'kg', 100],
  ['azafran', 'Azafrán', 'condimento', 'kg', 100], ['nuez-moscada', 'Nuez moscada', 'condimento', 'kg', 100], ['vinagre-jerez', 'Vinagre de Jerez', 'condimento', 'L', 100],
  ['vinagre-vino', 'Vinagre de vino', 'condimento', 'L', 100], ['vinagre-balsamico', 'Vinagre balsámico', 'condimento', 'L', 100, 'balsamico de modena'], ['vinagre-manzana', 'Vinagre de manzana', 'condimento', 'L', 100],
  ['mostaza', 'Mostaza', 'condimento', 'kg', 100], ['salsa-soja', 'Salsa de soja', 'condimento', 'L', 100, 'soja'],
  // Salsas y preparados
  ['mayonesa', 'Mayonesa', 'salsa', 'kg', 100], ['ketchup', 'Kétchup', 'salsa', 'kg', 100, 'ketchup'], ['caldo-pollo', 'Caldo de pollo', 'salsa', 'L', 100],
  ['caldo-pescado', 'Caldo de pescado', 'salsa', 'L', 100, 'fumet'], ['salsa-barbacoa', 'Salsa barbacoa', 'salsa', 'kg', 100], ['alioli', 'Alioli', 'salsa', 'kg', 100],
  ['pan-rallado', 'Pan rallado', 'salsa', 'kg', 100], ['tempura', 'Harina para tempura', 'salsa', 'kg', 100],
  // Azúcar, frutos secos y repostería
  ['azucar', 'Azúcar blanco', 'reposteria', 'kg', 100, 'azucar'], ['azucar-moreno', 'Azúcar moreno', 'reposteria', 'kg', 100], ['azucar-glas', 'Azúcar glas', 'reposteria', 'kg', 100],
  ['chocolate-cobertura', 'Chocolate negro de cobertura', 'reposteria', 'kg', 100], ['cacao-polvo', 'Cacao en polvo', 'reposteria', 'kg', 100], ['levadura-quimica', 'Levadura química', 'reposteria', 'kg', 100],
  ['levadura-fresca', 'Levadura fresca', 'reposteria', 'kg', 100], ['gelatina-hojas', 'Gelatina en hojas', 'reposteria', 'kg', 100], ['miel', 'Miel', 'reposteria', 'kg', 100],
  ['almendra', 'Almendra marcona', 'reposteria', 'kg', 100], ['nuez', 'Nuez pelada', 'reposteria', 'kg', 100], ['pinon', 'Piñón', 'reposteria', 'kg', 100],
  ['avellana', 'Avellana', 'reposteria', 'kg', 100],
  // Congelados
  ['patatas-fritas-cong', 'Patatas fritas congeladas', 'congelado', 'kg', 100, 'patata prefrita'], ['guisante-cong', 'Guisante congelado', 'congelado', 'kg', 100], ['masa-hojaldre', 'Masa de hojaldre', 'congelado', 'kg', 100],
  ['helado-vainilla', 'Helado de vainilla', 'congelado', 'L', 100], ['croqueta-cong', 'Croqueta congelada', 'congelado', 'kg', 100], ['gamba-cong', 'Gamba pelada congelada', 'congelado', 'kg', 80],
  // Café e infusiones
  ['cafe-grano', 'Café en grano', 'cafe', 'kg', 100], ['cafe-molido', 'Café molido', 'cafe', 'kg', 100], ['cafe-descafeinado', 'Café descafeinado', 'cafe', 'kg', 100],
  ['te-negro', 'Té negro', 'cafe', 'ud', 100], ['manzanilla', 'Infusión de manzanilla', 'cafe', 'ud', 100], ['cacao-soluble', 'Cacao soluble', 'cafe', 'kg', 100],
  // Aguas, refrescos y zumos
  ['agua-50', 'Agua mineral 50 cl', 'bebida', 'ud', 100, 'agua 0.5'], ['agua-150', 'Agua mineral 1,5 L', 'bebida', 'ud', 100], ['agua-gas', 'Agua con gas', 'bebida', 'ud', 100],
  ['refresco-cola', 'Refresco de cola', 'bebida', 'ud', 100, 'cola'], ['refresco-naranja', 'Refresco de naranja', 'bebida', 'ud', 100], ['refresco-limon', 'Refresco de limón', 'bebida', 'ud', 100],
  ['tonica', 'Tónica', 'bebida', 'ud', 100], ['zumo-naranja', 'Zumo de naranja', 'bebida', 'L', 100], ['zumo-pina', 'Zumo de piña', 'bebida', 'L', 100],
  ['cerveza-sin', 'Cerveza sin alcohol', 'bebida', 'ud', 100, 'cerveza 0,0'],
  // Cervezas
  ['cerveza-barril', 'Cerveza de barril', 'cerveza', 'L', 100, 'barril cerveza'], ['cerveza-botellin', 'Cerveza botellín 1/5', 'cerveza', 'ud', 100, 'botellin'], ['cerveza-tercio', 'Cerveza tercio', 'cerveza', 'ud', 100],
  ['cerveza-lata', 'Cerveza lata 33 cl', 'cerveza', 'ud', 100], ['cerveza-artesana', 'Cerveza artesana', 'cerveza', 'ud', 100],
  // Vinos, cavas y sidras
  ['vino-tinto-crianza', 'Vino tinto crianza', 'vino', 'ud', 100], ['vino-tinto-joven', 'Vino tinto joven', 'vino', 'ud', 100], ['vino-blanco', 'Vino blanco verdejo', 'vino', 'ud', 100, 'verdejo'],
  ['vino-rosado', 'Vino rosado', 'vino', 'ud', 100], ['cava', 'Cava brut', 'vino', 'ud', 100], ['vino-cocina', 'Vino blanco para cocinar', 'vino', 'L', 100],
  ['vermut', 'Vermut', 'vino', 'L', 100], ['sidra', 'Sidra', 'vino', 'ud', 100],
  // Licores y destilados
  ['ginebra', 'Ginebra', 'licor', 'ud', 100, 'gin'], ['ron', 'Ron', 'licor', 'ud', 100], ['whisky', 'Whisky', 'licor', 'ud', 100],
  ['vodka', 'Vodka', 'licor', 'ud', 100], ['brandy', 'Brandy', 'licor', 'ud', 100, 'coñac'], ['licor-hierbas', 'Licor de hierbas', 'licor', 'ud', 100],
  ['pacharan', 'Pacharán', 'licor', 'ud', 100], ['orujo', 'Orujo', 'licor', 'ud', 100], ['tequila', 'Tequila', 'licor', 'ud', 100],
  // Limpieza y desechables
  ['lavavajillas', 'Lavavajillas máquina', 'limpieza', 'L', 100], ['desengrasante', 'Desengrasante', 'limpieza', 'L', 100], ['lejia', 'Lejía', 'limpieza', 'L', 100],
  ['papel-secamanos', 'Papel secamanos', 'limpieza', 'ud', 100], ['servilletas', 'Servilletas', 'limpieza', 'ud', 100], ['guantes-nitrilo', 'Guantes de nitrilo', 'limpieza', 'ud', 100],
  ['film', 'Film transparente', 'limpieza', 'ud', 100], ['papel-aluminio', 'Papel de aluminio', 'limpieza', 'ud', 100], ['bolsas-basura', 'Bolsas de basura', 'limpieza', 'ud', 100],
  ['envases-llevar', 'Envases para llevar', 'limpieza', 'ud', 100],
];

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const catIds = new Set(CATS.map((c) => c[0]));
const ids = new Set();
for (const it of ITEMS) {
  if (!catIds.has(it[2])) throw new Error('categoría desconocida ' + it[2]);
  if (ids.has(it[0])) throw new Error('id duplicado ' + it[0]);
  ids.add(it[0]);
}
let sql = '-- Catálogo base del sector (generado por scripts/gen-catalog.mjs)\n';
sql += 'insert into catalog_categories (id, name, singular, iva, kind, orden) values\n' +
  CATS.map((c, i) => `  (${q(c[0])}, ${q(c[1])}, ${q(c[2])}, ${c[3]}, ${q(c[4])}, ${i + 1})`).join(',\n') +
  '\non conflict (id) do update set name = excluded.name, singular = excluded.singular, iva = excluded.iva, kind = excluded.kind, orden = excluded.orden;\n\n';
sql += 'insert into catalog_items (id, name, category_id, unit, rend, aliases) values\n' +
  ITEMS.map(([id, name, cat, unit, rend, ...al]) => `  (${q(id)}, ${q(name)}, ${q(cat)}, ${q(unit)}, ${rend}, array[${al.map(q).join(', ')}]::text[])`).join(',\n') +
  '\non conflict (id) do update set name = excluded.name, category_id = excluded.category_id, unit = excluded.unit, rend = excluded.rend, aliases = excluded.aliases;\n';
writeFileSync(here + 'db/migrations/0002_catalog.sql', sql);
console.log(CATS.length, 'categorías,', ITEMS.length, 'artículos');
