export type ItemCategory = "crop" | "animal" | "fish" | "mineral" | "processed" | "supply";

export type ItemDefinition = {
  key: string;
  name: string;
  shortName?: string;
  category: ItemCategory;
  icon?: string;
  basePrice: number;
  description: string;
  gemPrice?: number;
};

export const ITEMS: Record<string, ItemDefinition> = {
  carrot: { key: "carrot", name: "Морковь", category: "crop", basePrice: 7, description: "Хрустящий урожай с грядки" },
  wheat: { key: "wheat", name: "Пшеница", category: "crop", basePrice: 6, description: "Основа корма и городских заказов" },
  tomato: { key: "tomato", name: "Помидор", category: "crop", basePrice: 16, description: "Сочный овощ для сока" },
  cabbage: { key: "cabbage", name: "Капуста", category: "crop", basePrice: 22, description: "Подходит для квашения" },
  strawberry: { key: "strawberry", name: "Клубника", category: "crop", basePrice: 21, description: "Ягода для ароматного варенья" },
  egg: { key: "egg", name: "Яйца", category: "animal", basePrice: 15, description: "Свежие яйца из курятника" },
  milk: { key: "milk", name: "Молоко", category: "animal", basePrice: 24, description: "Используется для сыра" },
  wool: { key: "wool", name: "Шерсть", category: "animal", basePrice: 36, description: "Мягкая овечья шерсть" },
  truffle: { key: "truffle", name: "Трюфель", category: "animal", basePrice: 85, description: "Раритет, найденный пиг" },
  carp: { key: "carp", name: "Карп", category: "fish", basePrice: 18, description: "Рыба из пруда или удочки" },
  trout: { key: "trout", name: "Форель", category: "fish", basePrice: 32, description: "Ценная речная рыба" },
  catfish: { key: "catfish", name: "Сом", category: "fish", basePrice: 44, description: "Крупная рыба из садка" },
  sturgeon: { key: "sturgeon", name: "Осётр", category: "fish", basePrice: 70, description: "Редкая порода для садка" },
  pike: { key: "pike", name: "Щука", category: "fish", basePrice: 48, description: "Хищный трофей рыбака" },
  golden_fish: { key: "golden_fish", name: "Золотая рыбка", category: "fish", basePrice: 160, description: "Очень редкий улов" },
  stone: { key: "stone", name: "Камень", category: "mineral", basePrice: 5, description: "Строительный материал" },
  coal: { key: "coal", name: "Уголь", category: "mineral", basePrice: 12, description: "Топливо из глубоких шахт" },
  copper: { key: "copper", name: "Медь", category: "mineral", basePrice: 25, description: "Руда тёплого оттенка" },
  iron: { key: "iron", name: "Железо", category: "mineral", basePrice: 42, description: "Прочная руда" },
  gold: { key: "gold", name: "Золото", category: "mineral", basePrice: 90, description: "Редкий самородок" },
  pickles: { key: "pickles", name: "Квашеная капуста", shortName: "Капуста в кадке", category: "processed", basePrice: 62, description: "Заготовка из погреба" },
  cheese: { key: "cheese", name: "Сыр", category: "processed", basePrice: 78, description: "Выдержанный фермерский сыр" },
  jam: { key: "jam", name: "Варенье", category: "processed", basePrice: 76, description: "Клубничное варенье" },
  juice: { key: "juice", name: "Томатный сок", shortName: "Сок", category: "processed", basePrice: 70, description: "Густой домашний сок" },
  carrot_seed: { key: "carrot_seed", name: "Семена моркови", shortName: "Семена: морковь", category: "supply", basePrice: 8, description: "Для посадки на грядке" },
  wheat_seed: { key: "wheat_seed", name: "Семена пшеницы", shortName: "Семена: пшеница", category: "supply", basePrice: 12, description: "Для посадки на грядке" },
  tomato_seed: { key: "tomato_seed", name: "Семена томатов", shortName: "Семена: томат", category: "supply", basePrice: 18, description: "Для посадки на грядке" },
  cabbage_seed: { key: "cabbage_seed", name: "Семена капусты", shortName: "Семена: капуста", category: "supply", basePrice: 25, description: "Для посадки на грядке" },
  strawberry_seed: { key: "strawberry_seed", name: "Семена клубники", shortName: "Семена: клубника", category: "supply", basePrice: 40, description: "Для посадки на грядке" },
  feed: { key: "feed", name: "Комбикорм", category: "supply", basePrice: 10, description: "Корм для загонов и прудов" },
  compound_feed: { key: "compound_feed", name: "Рыбный корм", category: "supply", basePrice: 18, description: "Питательный корм для садков" },
  carp_fry: { key: "carp_fry", name: "Малёк карпа", category: "supply", basePrice: 20, description: "Запускается в пруд" },
  trout_fry: { key: "trout_fry", name: "Малёк форели", category: "supply", basePrice: 32, description: "Запускается в пруд" },
  catfish_fry: { key: "catfish_fry", name: "Малёк сома", category: "supply", basePrice: 45, description: "Запускается в садок" },
  sturgeon_fry: { key: "sturgeon_fry", name: "Малёк осетра", category: "supply", basePrice: 70, description: "Запускается в садок" },
  pickaxe: { key: "pickaxe", name: "Алмазная кирка", shortName: "Кирка", category: "supply", basePrice: 35, description: "Один заряд для Алмазной шахты" },
  honey_cake: { key: "honey_cake", name: "Медовик", category: "supply", basePrice: 45, description: "Восстанавливает 12 энергии" },
  potato: { key: "potato", name: "Картофель", category: "crop", basePrice: 12, description: "Второй хлеб на ферме" },
  cucumber: { key: "cucumber", name: "Огурец", category: "crop", basePrice: 18, description: "Хрустящий и свежий" },
  corn: { key: "corn", name: "Кукуруза", category: "crop", basePrice: 26, description: "Золотые початки" },
  pumpkin: { key: "pumpkin", name: "Тыква", category: "crop", basePrice: 40, description: "Символ осеннего урожая" },
  onion: { key: "onion", name: "Лук", category: "crop", basePrice: 14, description: "Острый и полезный" },
  pepper: { key: "pepper", name: "Перец", category: "crop", basePrice: 30, description: "Яркий сладкий перец" },
  potato_seed: { key: "potato_seed", name: "Клубни картофеля", shortName: "Семена: картофель", category: "supply", basePrice: 14, description: "Для посадки на грядке" },
  cucumber_seed: { key: "cucumber_seed", name: "Семена огурцов", shortName: "Семена: огурец", category: "supply", basePrice: 20, description: "Для посадки на грядке" },
  corn_seed: { key: "corn_seed", name: "Семена кукурузы", shortName: "Семена: кукуруза", category: "supply", basePrice: 30, description: "Для посадки на грядке" },
  pumpkin_seed: { key: "pumpkin_seed", name: "Семена тыквы", shortName: "Семена: тыква", category: "supply", basePrice: 46, description: "Для посадки на грядке" },
  onion_seed: { key: "onion_seed", name: "Семена лука", shortName: "Семена: лук", category: "supply", basePrice: 16, description: "Для посадки на грядке" },
  pepper_seed: { key: "pepper_seed", name: "Семена перца", shortName: "Семена: перец", category: "supply", basePrice: 34, description: "Для посадки на грядке" },
  crucian: { key: "crucian", name: "Карась", category: "fish", basePrice: 22, description: "Золотистая рыбка пруда" },
  perch: { key: "perch", name: "Окунь", category: "fish", basePrice: 26, description: "Полосатый обитатель пруда" },
  eel: { key: "eel", name: "Угорь", category: "fish", basePrice: 60, description: "Скользкий деликатес" },
  salmon: { key: "salmon", name: "Лосось", category: "fish", basePrice: 78, description: "Розовое сокровище садка" },
  crucian_fry: { key: "crucian_fry", name: "Малёк карася", category: "supply", basePrice: 22, description: "Запускается в пруд" },
  perch_fry: { key: "perch_fry", name: "Малёк окуня", category: "supply", basePrice: 26, description: "Запускается в пруд" },
  eel_fry: { key: "eel_fry", name: "Малёк угря", category: "supply", basePrice: 60, description: "Запускается в садок" },
  salmon_fry: { key: "salmon_fry", name: "Малёк лосося", category: "supply", basePrice: 75, description: "Запускается в садок" },
  duck_egg: { key: "duck_egg", name: "Утиное яйцо", category: "animal", basePrice: 22, description: "Крупное и питательное" },
  feather: { key: "feather", name: "Пух и перо", category: "animal", basePrice: 28, description: "Для подушек и нарядов" },
  fur: { key: "fur", name: "Мех", category: "animal", basePrice: 40, description: "Мягкий кроличий мех" },
  goat_milk: { key: "goat_milk", name: "Козье молоко", category: "animal", basePrice: 30, description: "Основа для сыров" },
  honey: { key: "honey", name: "Мёд", category: "animal", basePrice: 55, description: "С пасеки долины" },
  meat: { key: "meat", name: "Мясо птицы", category: "animal", basePrice: 48, description: "Фермерская птица" },
  bread: { key: "bread", name: "Хлеб", category: "processed", basePrice: 70, description: "Свежая буханка из печи" },
  butter: { key: "butter", name: "Масло", category: "processed", basePrice: 64, description: "Сбитое из сливок" },
  soup: { key: "soup", name: "Уха", category: "processed", basePrice: 96, description: "Наваристая рыбацкая похлёбка" },
  pie: { key: "pie", name: "Тыквенный пирог", category: "processed", basePrice: 120, description: "Гордость осенней ярмарки" },
  beet: { key: "beet", name: "Свёкла", category: "crop", icon: "carrot", basePrice: 30, description: "Урожай высокого уровня" },
  beet_seed: { key: "beet_seed", name: "Семена: свёкла", shortName: "Семена: свёкла", category: "supply", icon: "carrot", basePrice: 44, description: "Для посадки на грядке" },
  eggplant: { key: "eggplant", name: "Баклажан", category: "crop", icon: "strawberry", basePrice: 38, description: "Урожай высокого уровня" },
  eggplant_seed: { key: "eggplant_seed", name: "Семена: баклажан", shortName: "Семена: баклажан", category: "supply", icon: "strawberry", basePrice: 54, description: "Для посадки на грядке" },
  broccoli: { key: "broccoli", name: "Брокколи", category: "crop", icon: "cabbage", basePrice: 46, description: "Урожай высокого уровня" },
  broccoli_seed: { key: "broccoli_seed", name: "Семена: брокколи", shortName: "Семена: брокколи", category: "supply", icon: "cabbage", basePrice: 64, description: "Для посадки на грядке" },
  garlic: { key: "garlic", name: "Чеснок", category: "crop", icon: "onion", basePrice: 52, description: "Урожай высокого уровня" },
  garlic_seed: { key: "garlic_seed", name: "Семена: чеснок", shortName: "Семена: чеснок", category: "supply", icon: "onion", basePrice: 70, description: "Для посадки на грядке" },
  watermelon: { key: "watermelon", name: "Арбуз", category: "crop", icon: "citrus", basePrice: 96, description: "Урожай высокого уровня" },
  watermelon_seed: { key: "watermelon_seed", name: "Семена: арбуз", shortName: "Семена: арбуз", category: "supply", icon: "citrus", basePrice: 120, description: "Для посадки на грядке" },
  sunflower: { key: "sunflower", name: "Подсолнух", category: "crop", icon: "sun", basePrice: 70, description: "Урожай высокого уровня" },
  sunflower_seed: { key: "sunflower_seed", name: "Семена: подсолнух", shortName: "Семена: подсолнух", category: "supply", icon: "sun", basePrice: 92, description: "Для посадки на грядке" },
  grape: { key: "grape", name: "Виноград", category: "crop", icon: "strawberry", basePrice: 110, description: "Урожай высокого уровня" },
  grape_seed: { key: "grape_seed", name: "Семена: виноград", shortName: "Семена: виноград", category: "supply", icon: "strawberry", basePrice: 140, description: "Для посадки на грядке" },
  golden_wheat: { key: "golden_wheat", name: "Золотая пшеница", category: "crop", icon: "wheat", basePrice: 34, description: "Редкий урожай из алмазных семян" },
  golden_wheat_seed: { key: "golden_wheat_seed", name: "Алмазные семена: золотая пшеница", shortName: "Алмазные: золотая пшеница", category: "supply", icon: "wheat", basePrice: 75, description: "Продаются только за алмазы", gemPrice: 3 },
  rainbow_berry: { key: "rainbow_berry", name: "Радужная ягода", category: "crop", icon: "cherry", basePrice: 58, description: "Редкий урожай из алмазных семян" },
  rainbow_berry_seed: { key: "rainbow_berry_seed", name: "Алмазные семена: радужная ягода", shortName: "Алмазные: радужная ягода", category: "supply", icon: "cherry", basePrice: 125, description: "Продаются только за алмазы", gemPrice: 5 },
  magic_pumpkin: { key: "magic_pumpkin", name: "Волшебная тыква", category: "crop", icon: "pumpkin", basePrice: 110, description: "Редкий урожай из алмазных семян" },
  magic_pumpkin_seed: { key: "magic_pumpkin_seed", name: "Алмазные семена: волшебная тыква", shortName: "Алмазные: волшебная тыква", category: "supply", icon: "pumpkin", basePrice: 200, description: "Продаются только за алмазы", gemPrice: 8 },
  diamond_melon: { key: "diamond_melon", name: "Алмазный арбуз", category: "crop", icon: "gem", basePrice: 190, description: "Редкий урожай из алмазных семян" },
  diamond_melon_seed: { key: "diamond_melon_seed", name: "Алмазные семена: алмазный арбуз", shortName: "Алмазные: алмазный арбуз", category: "supply", icon: "gem", basePrice: 350, description: "Продаются только за алмазы", gemPrice: 14 },
  bream: { key: "bream", name: "Лещ", category: "fish", icon: "fish", basePrice: 34, description: "Ценная рыба высокого уровня" },
  bream_fry: { key: "bream_fry", name: "Малёк: лещ", category: "supply", icon: "fish", basePrice: 38, description: "Запускается в пруд" },
  tench: { key: "tench", name: "Линь", category: "fish", icon: "fish", basePrice: 42, description: "Ценная рыба высокого уровня" },
  tench_fry: { key: "tench_fry", name: "Малёк: линь", category: "supply", icon: "fish", basePrice: 46, description: "Запускается в пруд" },
  zander: { key: "zander", name: "Судак", category: "fish", icon: "fish", basePrice: 60, description: "Ценная рыба высокого уровня" },
  zander_fry: { key: "zander_fry", name: "Малёк: судак", category: "supply", icon: "fish", basePrice: 66, description: "Запускается в пруд" },
  beluga: { key: "beluga", name: "Белуга", category: "fish", icon: "fish", basePrice: 130, description: "Ценная рыба высокого уровня" },
  beluga_fry: { key: "beluga_fry", name: "Малёк: белуга", category: "supply", icon: "fish", basePrice: 140, description: "Запускается в садок" },
  nelma: { key: "nelma", name: "Нельма", category: "fish", icon: "fish", basePrice: 100, description: "Ценная рыба высокого уровня" },
  nelma_fry: { key: "nelma_fry", name: "Малёк: нельма", category: "supply", icon: "fish", basePrice: 108, description: "Запускается в садок" },
  koi: { key: "koi", name: "Кои", category: "fish", icon: "fish", basePrice: 62, description: "Редкая рыба из алмазных мальков" },
  koi_fry: { key: "koi_fry", name: "Алмазный малёк: кои", category: "supply", icon: "fish", basePrice: 75, description: "Продаётся только за алмазы", gemPrice: 3 },
  rainbow_trout: { key: "rainbow_trout", name: "Радужная форель", category: "fish", icon: "fish", basePrice: 80, description: "Редкая рыба из алмазных мальков" },
  rainbow_trout_fry: { key: "rainbow_trout_fry", name: "Алмазный малёк: радужная форель", category: "supply", icon: "fish", basePrice: 125, description: "Продаётся только за алмазы", gemPrice: 5 },
  royal_sturgeon: { key: "royal_sturgeon", name: "Королевский осётр", category: "fish", icon: "fish", basePrice: 150, description: "Редкая рыба из алмазных мальков" },
  royal_sturgeon_fry: { key: "royal_sturgeon_fry", name: "Алмазный малёк: королевский осётр", category: "supply", icon: "fish", basePrice: 175, description: "Продаётся только за алмазы", gemPrice: 7 },
  diamond_eel: { key: "diamond_eel", name: "Алмазный угорь", category: "fish", icon: "gem", basePrice: 170, description: "Редкая рыба из алмазных мальков" },
  diamond_eel_fry: { key: "diamond_eel_fry", name: "Алмазный малёк: алмазный угорь", category: "supply", icon: "fish", basePrice: 250, description: "Продаётся только за алмазы", gemPrice: 10 },
  alpaca_wool: { key: "alpaca_wool", name: "Шерсть альпаки", category: "animal", icon: "wool", basePrice: 76, description: "Продукт высокоуровневых животных" },
  ostrich_egg: { key: "ostrich_egg", name: "Страусиное яйцо", category: "animal", icon: "egg", basePrice: 98, description: "Продукт высокоуровневых животных" },
  yak_milk: { key: "yak_milk", name: "Молоко яка", category: "animal", icon: "milk", basePrice: 64, description: "Продукт высокоуровневых животных" },
  peacock_feather: { key: "peacock_feather", name: "Павлинье перо", category: "animal", icon: "feather", basePrice: 110, description: "Продукт высокоуровневых животных" },
  golden_egg: { key: "golden_egg", name: "Золотое яйцо", category: "animal", icon: "star", basePrice: 70, description: "Продукт редких животных" },
  rainbow_milk: { key: "rainbow_milk", name: "Радужное молоко", category: "animal", icon: "milk", basePrice: 95, description: "Продукт редких животных" },
  phoenix_feather: { key: "phoenix_feather", name: "Перо феникса", category: "animal", icon: "flame", basePrice: 260, description: "Продукт редких животных" },
};

export type CropConfig = { name: string; seed: string; duration: number; yield: number; xp: number; level: number; color: string };
export const CROPS: Record<string, CropConfig> = {
  carrot: { name: "Морковь", seed: "carrot_seed", duration: 15_000, yield: 2, xp: 9, level: 1, color: "#f4933c" },
  wheat: { name: "Пшеница", seed: "wheat_seed", duration: 25_000, yield: 3, xp: 11, level: 1, color: "#e0b744" },
  onion: { name: "Лук", seed: "onion_seed", duration: 20_000, yield: 2, xp: 12, level: 1, color: "#c9a4d8" },
  potato: { name: "Картофель", seed: "potato_seed", duration: 35_000, yield: 3, xp: 15, level: 2, color: "#c39158" },
  tomato: { name: "Помидор", seed: "tomato_seed", duration: 40_000, yield: 2, xp: 15, level: 2, color: "#ec6a51" },
  cucumber: { name: "Огурец", seed: "cucumber_seed", duration: 45_000, yield: 2, xp: 18, level: 2, color: "#6aa84f" },
  pepper: { name: "Перец", seed: "pepper_seed", duration: 55_000, yield: 2, xp: 22, level: 3, color: "#e05a45" },
  cabbage: { name: "Капуста", seed: "cabbage_seed", duration: 60_000, yield: 2, xp: 19, level: 3, color: "#8fbe63" },
  corn: { name: "Кукуруза", seed: "corn_seed", duration: 75_000, yield: 2, xp: 26, level: 4, color: "#e8c047" },
  strawberry: { name: "Клубника", seed: "strawberry_seed", duration: 90_000, yield: 3, xp: 26, level: 4, color: "#e05a67" },
  pumpkin: { name: "Тыква", seed: "pumpkin_seed", duration: 120_000, yield: 1, xp: 38, level: 5, color: "#e88c3f" },
  beet: { name: "Свёкла", seed: "beet_seed", duration: 50_000, yield: 3, xp: 24, level: 6, color: "#a8325e" },
  eggplant: { name: "Баклажан", seed: "eggplant_seed", duration: 60_000, yield: 3, xp: 28, level: 7, color: "#6a3d8f" },
  broccoli: { name: "Брокколи", seed: "broccoli_seed", duration: 70_000, yield: 3, xp: 32, level: 8, color: "#4f9d3a" },
  garlic: { name: "Чеснок", seed: "garlic_seed", duration: 75_000, yield: 3, xp: 36, level: 9, color: "#e9e1c9" },
  watermelon: { name: "Арбуз", seed: "watermelon_seed", duration: 100_000, yield: 2, xp: 52, level: 10, color: "#3d9a4b" },
  sunflower: { name: "Подсолнух", seed: "sunflower_seed", duration: 90_000, yield: 3, xp: 48, level: 11, color: "#f2c230" },
  grape: { name: "Виноград", seed: "grape_seed", duration: 120_000, yield: 3, xp: 66, level: 12, color: "#7b3fa0" },
  golden_wheat: { name: "Золотая пшеница", seed: "golden_wheat_seed", duration: 30_000, yield: 6, xp: 28, level: 3, color: "#f5c518" },
  rainbow_berry: { name: "Радужная ягода", seed: "rainbow_berry_seed", duration: 45_000, yield: 5, xp: 42, level: 4, color: "#e94f9b" },
  magic_pumpkin: { name: "Волшебная тыква", seed: "magic_pumpkin_seed", duration: 70_000, yield: 4, xp: 70, level: 6, color: "#9b5de5" },
  diamond_melon: { name: "Алмазный арбуз", seed: "diamond_melon_seed", duration: 110_000, yield: 5, xp: 130, level: 9, color: "#3cc9f0" },
};
export type CropKey = keyof typeof CROPS;

export const POND_SPECIES = {
  carp: { name: "Карп", fry: "carp_fry", duration: 45_000, yield: 2, xp: 15, level: 1 },
  crucian: { name: "Карась", fry: "crucian_fry", duration: 60_000, yield: 2, xp: 18, level: 2 },
  trout: { name: "Форель", fry: "trout_fry", duration: 70_000, yield: 2, xp: 22, level: 3 },
  perch: { name: "Окунь", fry: "perch_fry", duration: 80_000, yield: 2, xp: 24, level: 4 },
  bream: { name: "Лещ", fry: "bream_fry", duration: 85_000, yield: 3, xp: 28, level: 5 },
  tench: { name: "Линь", fry: "tench_fry", duration: 95_000, yield: 3, xp: 34, level: 7 },
  zander: { name: "Судак", fry: "zander_fry", duration: 110_000, yield: 3, xp: 46, level: 9 },
  koi: { name: "Кои", fry: "koi_fry", duration: 40_000, yield: 3, xp: 30, level: 3 },
  rainbow_trout: { name: "Радужная форель", fry: "rainbow_trout_fry", duration: 60_000, yield: 4, xp: 52, level: 5 },
} as const;

export const CAGE_SPECIES = {
  catfish: { name: "Сом", fry: "catfish_fry", duration: 60_000, yield: 2, xp: 22, level: 1 },
  sturgeon: { name: "Осётр", fry: "sturgeon_fry", duration: 95_000, yield: 2, xp: 32, level: 3 },
  eel: { name: "Угорь", fry: "eel_fry", duration: 110_000, yield: 2, xp: 38, level: 4 },
  salmon: { name: "Лосось", fry: "salmon_fry", duration: 140_000, yield: 1, xp: 48, level: 5 },
  beluga: { name: "Белуга", fry: "beluga_fry", duration: 150_000, yield: 2, xp: 62, level: 6 },
  nelma: { name: "Нельма", fry: "nelma_fry", duration: 130_000, yield: 2, xp: 72, level: 8 },
  royal_sturgeon: { name: "Королевский осётр", fry: "royal_sturgeon_fry", duration: 100_000, yield: 3, xp: 85, level: 5 },
  diamond_eel: { name: "Алмазный угорь", fry: "diamond_eel_fry", duration: 120_000, yield: 4, xp: 130, level: 7 },
} as const;

export const ANIMALS = {
  chicken: { name: "Куры", product: "egg", feed: 1, duration: 30_000, yield: 2, xp: 13, level: 1 },
  cow: { name: "Коровы", product: "milk", feed: 2, duration: 60_000, yield: 2, xp: 22, level: 2 },
  duck: { name: "Утки", product: "duck_egg", feed: 1, duration: 40_000, yield: 2, xp: 16, level: 2 },
  rabbit: { name: "Кролики", product: "fur", feed: 2, duration: 55_000, yield: 1, xp: 22, level: 3 },
  goat: { name: "Козы", product: "goat_milk", feed: 2, duration: 65_000, yield: 2, xp: 26, level: 3 },
  sheep: { name: "Овцы", product: "wool", feed: 2, duration: 75_000, yield: 2, xp: 26, level: 4 },
  turkey: { name: "Индюки", product: "meat", feed: 2, duration: 85_000, yield: 1, xp: 30, level: 4 },
  goose: { name: "Гуси", product: "feather", feed: 2, duration: 90_000, yield: 2, xp: 28, level: 5 },
  pig: { name: "Свиньи", product: "truffle", feed: 3, duration: 90_000, yield: 1, xp: 34, level: 5 },
  bee: { name: "Пчёлы", product: "honey", feed: 1, duration: 100_000, yield: 2, xp: 32, level: 6 },
  alpaca: { name: "Альпаки", product: "alpaca_wool", feed: 3, duration: 110_000, yield: 2, xp: 40, level: 7 },
  ostrich: { name: "Страусы", product: "ostrich_egg", feed: 3, duration: 120_000, yield: 2, xp: 46, level: 8 },
  yak: { name: "Яки", product: "yak_milk", feed: 3, duration: 100_000, yield: 3, xp: 44, level: 9 },
  peacock: { name: "Павлины", product: "peacock_feather", feed: 3, duration: 130_000, yield: 2, xp: 54, level: 10 },
  golden_goose: { name: "Золотые гуси", product: "golden_egg", feed: 2, duration: 45_000, yield: 3, xp: 40, level: 3, gems: 15 },
  rainbow_cow: { name: "Радужные коровы", product: "rainbow_milk", feed: 2, duration: 60_000, yield: 3, xp: 60, level: 5, gems: 25 },
  phoenix: { name: "Феникс", product: "phoenix_feather", feed: 3, duration: 120_000, yield: 2, xp: 150, level: 8, gems: 45 },
} as const;

export type Recipe = { name: string; inputs: Record<string, number>; output: string; amount: number; duration: number; xp: number; level: number };
export const RECIPES: Record<string, Recipe> = {
  feed: { name: "Рыбный корм", inputs: { wheat: 3 }, output: "compound_feed", amount: 3, duration: 25_000, xp: 8, level: 1 },
  juice: { name: "Томатный сок", inputs: { tomato: 3 }, output: "juice", amount: 1, duration: 40_000, xp: 20, level: 2 },
  pickles: { name: "Квашеная капуста", inputs: { cabbage: 2 }, output: "pickles", amount: 1, duration: 45_000, xp: 24, level: 3 },
  cheese: { name: "Фермерский сыр", inputs: { milk: 2 }, output: "cheese", amount: 1, duration: 55_000, xp: 28, level: 2 },
  jam: { name: "Клубничное варенье", inputs: { strawberry: 2 }, output: "jam", amount: 1, duration: 60_000, xp: 30, level: 4 },
  bread: { name: "Домашний хлеб", inputs: { wheat: 3 }, output: "bread", amount: 1, duration: 50_000, xp: 22, level: 2 },
  butter: { name: "Сливочное масло", inputs: { milk: 2 }, output: "butter", amount: 1, duration: 45_000, xp: 24, level: 3 },
  soup: { name: "Рыбацкая уха", inputs: { perch: 1, potato: 2 }, output: "soup", amount: 1, duration: 70_000, xp: 34, level: 3 },
  pie: { name: "Тыквенный пирог", inputs: { pumpkin: 1, egg: 2 }, output: "pie", amount: 1, duration: 90_000, xp: 46, level: 5 },
};

export const MINES = {
  copper: { name: "Медная шахта", energy: 4, level: 1, xp: 10, loot: [["stone", 35], ["coal", 30], ["copper", 35]] as const },
  iron: { name: "Железная шахта", energy: 6, level: 2, xp: 16, loot: [["stone", 25], ["coal", 25], ["copper", 20], ["iron", 30]] as const },
  gold: { name: "Золотая шахта", energy: 8, level: 4, xp: 24, loot: [["coal", 25], ["iron", 35], ["gold", 25], ["stone", 15]] as const },
} as const;

export const JOBS = {
  courier: { name: "Курьер рынка", description: "Доставить корзины торговцам", duration: 30_000, energy: 5, coins: 65, xp: 20, level: 1 },
  milkmaid: { name: "Помощник сыроварни", description: "Перебрать молочные бидоны", duration: 45_000, energy: 7, coins: 95, xp: 28, level: 2 },
  geologist: { name: "Горный геолог", description: "Разметить безопасную жилу", duration: 60_000, energy: 9, coins: 135, xp: 38, level: 3 },
  beekeeper: { name: "Помощник пасечника", description: "Проверить ульи на дальней пасеке", duration: 75_000, energy: 8, coins: 160, xp: 42, level: 4 },
  fishmonger: { name: "Продавец рыбы", description: "Разложить улов на утреннем рынке", duration: 55_000, energy: 6, coins: 115, xp: 30, level: 3 },
} as const;

export const SHOP_KEYS = [
  "carrot_seed", "wheat_seed", "onion_seed", "potato_seed", "tomato_seed", "cucumber_seed",
  "pepper_seed", "cabbage_seed", "corn_seed", "strawberry_seed", "pumpkin_seed",
  "feed", "compound_feed", "carp_fry", "crucian_fry", "trout_fry", "perch_fry",
  "catfish_fry", "sturgeon_fry", "eel_fry", "salmon_fry", "pickaxe", "honey_cake",
  "beet_seed", "eggplant_seed", "broccoli_seed", "garlic_seed", "watermelon_seed", "sunflower_seed", "grape_seed",
  "bream_fry", "tench_fry", "zander_fry", "beluga_fry", "nelma_fry",
];

export const NEWS = [
  { id: "welcome", tag: "Долина", title: "Новый сезон на Тихой ферме", body: "Грядки, пруды и мастерская снова открыты. Город обновил заказы, а на рынке цены меняются каждый час. Начните с моркови: полив ускоряет созревание на четверть." },
  { id: "fishing", tag: "Гид", title: "Как поймать редкую рыбу", body: "После заброса следите за поплавком. Нажмите «Подсечь», когда бегунок окажется внутри светлой зоны. Чем точнее попадание, тем выше шанс двойного улова." },
  { id: "elysium", tag: "Элизиум", title: "Свет Элизиума для каждого фермера", body: "С третьего уровня доступны ритуалы Элизиума. Выберите благословение урожая, энергии или торговли. Пять частиц эфира можно обменять на постоянное увеличение запаса энергии." },
];

export const PROMOTIONS = [
  { id: "starter", name: "Набор огородника", description: "По 4 семени моркови и пшеницы, 3 корма", gems: 2, items: { carrot_seed: 4, wheat_seed: 4, feed: 3 }, coins: 0 },
  { id: "angler", name: "Набор рыбака", description: "Мальки карпа и сома, 2 кирки", gems: 3, items: { carp_fry: 2, catfish_fry: 2, pickaxe: 2 }, coins: 0 },
  { id: "merchant", name: "Капитал торговца", description: "250 монет и медовик для экспедиции", gems: 4, items: { honey_cake: 1 }, coins: 250 },
];

export const BLESSINGS = {
  harvest: { name: "Щедрая земля", description: "+1 к урожаю каждой грядки на 5 минут" },
  energy: { name: "Лёгкое дыхание", description: "Энергия восстанавливается вдвое быстрее 5 минут" },
  fortune: { name: "Золотой ветер", description: "+15% к цене прямой продажи на 5 минут" },
} as const;

export function xpNeeded(level: number) {
  return 60 + (level - 1) * 45;
}

// Настраиваемые из админки глобальные параметры и лимиты улучшений.
export const GLOBALS: Record<string, number> = { barnBase: 60, barnPerLevel: 40, energyRegenSec: 20, energyUpgradeBonus: 5, maxLevel: 100, wheelSpinGems: 3, wheelPaidDaily: 10 };

export type UpgradeMeta = { name: string; description: string; max: number; baseCost: number; mult: number; unit: string };
export const UPGRADES: Record<string, UpgradeMeta> = {
  barn: { name: "Амбар", description: "Больше места для запасов", max: 8, baseCost: 220, mult: 1.55, unit: "ур." },
  garden: { name: "Новая грядка", description: "Ещё одна грядка в огороде", max: 10, baseCost: 180, mult: 1.55, unit: "шт." },
  pond: { name: "Новый пруд", description: "Дополнительный водоём", max: 4, baseCost: 260, mult: 1.55, unit: "шт." },
  pen: { name: "Новый загон", description: "Параллельный цикл животных", max: 4, baseCost: 280, mult: 1.55, unit: "шт." },
  cage: { name: "Новый садок", description: "Для крупных пород рыбы", max: 3, baseCost: 340, mult: 1.55, unit: "шт." },
  cellar: { name: "Полки погреба", description: "+1 одновременный рецепт", max: 4, baseCost: 320, mult: 1.55, unit: "ур." },
  energy: { name: "Дом фермера", description: "Больше максимальной энергии", max: 8, baseCost: 300, mult: 1.55, unit: "ур." },
};

export function barnCapacity(level: number) {
  return GLOBALS.barnBase + level * GLOBALS.barnPerLevel;
}

export function inventoryVolume(inventory: Record<string, number>) {
  return Object.values(inventory).reduce((sum, amount) => sum + Math.max(0, amount), 0);
}

export function marketPrice(itemKey: string, date = new Date()) {
  const base = ITEMS[itemKey]?.basePrice ?? 1;
  const day = Math.floor(date.getTime() / 86_400_000);
  const hour = date.getUTCHours();
  const wave = Math.sin(day * 1.71 + hour * 0.83 + itemKey.length * 1.19);
  const pulse = Math.cos(day * 0.37 + hour * 1.43 + itemKey.charCodeAt(0));
  return Math.max(1, Math.round(base * (0.9 + wave * 0.12 + pulse * 0.06)));
}

export function upgradeCost(kind: string, current: number) {
  const meta = UPGRADES[kind];
  return Math.round((meta?.baseCost ?? 250) * Math.pow(meta?.mult ?? 1.55, Math.max(0, current - 1)));
}

export function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// Пауза между забросами отсчитывается от предыдущего заброса, даже если рыба сорвалась.
export const FISHING_COOLDOWN_MS = 150_000;

export function fishingCursor(startedAt: number, period: number, now: number) {
  const phase = (((now - startedAt) / period) % 2 + 2) % 2;
  return phase <= 1 ? phase : 2 - phase;
}

export type WheelPrize = { id: string; label: string; kind: "coins" | "gems" | "energy" | "item"; amount: number; item?: string; weight: number; color: string };
// Колесо фортуны: восемь секторов, вес — относительный шанс выпадения.
export const WHEEL: WheelPrize[] = [
  { id: "coins60", label: "60", kind: "coins", amount: 60, weight: 22, color: "#ffd75e" },
  { id: "feed4", label: "×4", kind: "item", item: "feed", amount: 4, weight: 16, color: "#9be36a" },
  { id: "coins150", label: "150", kind: "coins", amount: 150, weight: 14, color: "#ffb347" },
  { id: "gem1", label: "1", kind: "gems", amount: 1, weight: 12, color: "#7fd9ff" },
  { id: "energy15", label: "+15", kind: "energy", amount: 15, weight: 14, color: "#b8a4ff" },
  { id: "coins400", label: "400", kind: "coins", amount: 400, weight: 6, color: "#ff8a5c" },
  { id: "gem3", label: "3", kind: "gems", amount: 3, weight: 4, color: "#4fc3f7" },
  { id: "gem12", label: "12", kind: "gems", amount: 12, weight: 2, color: "#ff6eb8" },
];

// Мини-игра «Растения против зомби».
export const PVZ = { energy: 6, waves: 10, coinsPerWave: 30, winCoins: 200, winGems: 2, minWaveMs: 14_000 };

/* ------------------------------------------------------------------ Стройка */

export type CostMeta = {
  name: string;
  description: string;
  effect: string;
  max: number;
  coinBase: number;
  coinMult: number;
  ore: string;
  oreBase: number;
  oreMult: number;
};

export type CostOverride = Partial<Pick<CostMeta, "max" | "coinBase" | "coinMult" | "oreBase" | "oreMult" | "ore">>;
export type CostOverrides = Record<string, CostOverride | undefined>;

// Уровни амбара, грядок и водоёма строятся за монеты и руду из шахт.
export const BUILDINGS: Record<"barn" | "garden" | "pond", CostMeta> = {
  barn: { name: "Амбар", description: "Больше места для запасов и заказов", effect: "+40 мест в амбаре за уровень", max: 10, coinBase: 240, coinMult: 1.62, ore: "stone", oreBase: 3, oreMult: 1.35 },
  garden: { name: "Грядки", description: "Две новые грядки за уровень", effect: "+2 грядки за уровень", max: 8, coinBase: 300, coinMult: 1.66, ore: "stone", oreBase: 4, oreMult: 1.38 },
  pond: { name: "Водоём", description: "Ещё один пруд под рыбу", effect: "+1 пруд за уровень", max: 6, coinBase: 420, coinMult: 1.7, ore: "copper", oreBase: 2, oreMult: 1.4 },
};

// Техника: кормушки, комбайн и аэратор. Строится за монеты и руду.
export const EQUIPMENT: Record<"feeder" | "harvester" | "aerator", CostMeta> = {
  feeder: { name: "Кормушки", description: "Автокормушки для животных в загонах", effect: "+8% скорости и +1 продукт каждые 2 уровня", max: 5, coinBase: 460, coinMult: 1.7, ore: "copper", oreBase: 3, oreMult: 1.42 },
  harvester: { name: "Комбайн", description: "Собирает весь урожай одним нажатием", effect: "Сбор за клик, +10% опыта за урожай", max: 5, coinBase: 900, coinMult: 1.82, ore: "iron", oreBase: 4, oreMult: 1.45 },
  aerator: { name: "Аэратор", description: "Поливает грядки при посадке", effect: "−10% времени роста за уровень", max: 5, coinBase: 720, coinMult: 1.78, ore: "iron", oreBase: 3, oreMult: 1.45 },
};

export const BUILDING_KINDS = ["barn", "garden", "pond"] as const;
export const EQUIPMENT_KINDS = ["feeder", "harvester", "aerator"] as const;

export function plotsForGarden(level: number) {
  return 4 + Math.max(1, level) * 2;
}

export function pondsForLevel(level: number) {
  return 1 + Math.max(1, level);
}

export function metaOf(kind: string, overrides: CostOverrides = {}): CostMeta | null {
  const base = (BUILDINGS as Record<string, CostMeta>)[kind] ?? (EQUIPMENT as Record<string, CostMeta>)[kind];
  if (!base) return null;
  const patch = overrides[kind] ?? {};
  return {
    ...base,
    ...patch,
    max: Math.max(1, Math.min(20, Math.round(Number(patch.max ?? base.max)))),
    coinBase: Math.max(1, Math.round(Number(patch.coinBase ?? base.coinBase))),
    coinMult: Math.max(1.01, Number(patch.coinMult ?? base.coinMult)),
    ore: String(patch.ore ?? base.ore),
    oreBase: Math.max(0, Math.round(Number(patch.oreBase ?? base.oreBase))),
    oreMult: Math.max(1, Number(patch.oreMult ?? base.oreMult)),
  };
}

/** Цена следующего уровня: монеты и руда, каждая ступень дороже. */
export function constructionPrice(kind: string, level: number, overrides: CostOverrides = {}) {
  const meta = metaOf(kind, overrides);
  if (!meta) return null;
  const step = Math.max(0, level - 1);
  return {
    meta,
    coins: Math.round(meta.coinBase * Math.pow(meta.coinMult, step)),
    ore: meta.ore,
    oreAmount: Math.round(meta.oreBase * Math.pow(meta.oreMult, step)),
  };
}

/* ---------------------------------------------------------------- Лотереи */

export type LotteryPrize = { key: string; label: string; kind: "coins" | "gems" | "item" | "energy" | "empty"; amount: number; item?: string; weight: number };
export type LotterySeed = { key: string; name: string; description: string; priceCoins: number; priceGems: number; prizes: LotteryPrize[] };

export const DEFAULT_LOTTERIES: LotterySeed[] = [
  {
    key: "morning", name: "Утренняя лотерея", description: "Дешёвый билет и частые небольшие призы", priceCoins: 120, priceGems: 0,
    prizes: [
      { key: "m-empty", label: "Пусто", kind: "empty", amount: 0, weight: 30 },
      { key: "m-60", label: "60 монет", kind: "coins", amount: 60, weight: 26 },
      { key: "m-150", label: "150 монет", kind: "coins", amount: 150, weight: 20 },
      { key: "m-feed", label: "5 комбикорма", kind: "item", item: "feed", amount: 5, weight: 14 },
      { key: "m-400", label: "400 монет", kind: "coins", amount: 400, weight: 8 },
      { key: "m-gem", label: "2 алмаза", kind: "gems", amount: 2, weight: 2 },
    ],
  },
  {
    key: "golden", name: "Золотая лотерея", description: "Крупные монетные призы за один билет", priceCoins: 450, priceGems: 0,
    prizes: [
      { key: "g-empty", label: "Пусто", kind: "empty", amount: 0, weight: 34 },
      { key: "g-200", label: "200 монет", kind: "coins", amount: 200, weight: 24 },
      { key: "g-700", label: "700 монет", kind: "coins", amount: 700, weight: 16 },
      { key: "g-1500", label: "1 500 монет", kind: "coins", amount: 1500, weight: 9 },
      { key: "g-energy", label: "30 энергии", kind: "energy", amount: 30, weight: 9 },
      { key: "g-5000", label: "Джекпот 5 000 монет", kind: "coins", amount: 5000, weight: 1 },
    ],
  },
  {
    key: "diamond", name: "Алмазная лотерея", description: "Билет за алмазы, в призах редкие предметы", priceCoins: 0, priceGems: 3,
    prizes: [
      { key: "d-empty", label: "Пусто", kind: "empty", amount: 0, weight: 32 },
      { key: "d-coin", label: "900 монет", kind: "coins", amount: 900, weight: 24 },
      { key: "d-gem1", label: "2 алмаза", kind: "gems", amount: 2, weight: 18 },
      { key: "d-pick", label: "3 кирки", kind: "item", item: "pickaxe", amount: 3, weight: 12 },
      { key: "d-cake", label: "Медовик", kind: "item", item: "honey_cake", amount: 2, weight: 9 },
      { key: "d-gem10", label: "10 алмазов", kind: "gems", amount: 10, weight: 4 },
      { key: "d-jackpot", label: "Джекпот: 15 алмазов", kind: "gems", amount: 15, weight: 1 },
    ],
  },
];
