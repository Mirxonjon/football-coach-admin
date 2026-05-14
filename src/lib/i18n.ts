"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect } from "react";

export type Locale = "uz" | "ru";
export const LOCALES: Locale[] = ["uz", "ru"];
export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
};

type LocaleState = {
  locale: Locale;
  setLocale: (l: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "uz",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "fc_admin_locale" }
  )
);

/**
 * Translation dictionary. The key is the Uzbek source string — the value is its
 * Russian counterpart. Keeping UZ as the key means JSX stays readable even
 * without inspecting the dictionary, and missing translations gracefully fall
 * back to UZ.
 */
const RU: Record<string, string> = {
  // ── Login ─────────────────────────────────────────────────────────────
  "Admin kirish": "Вход для администратора",
  "Football Coach boshqaruv paneli": "Панель администратора Football Coach",
  "Email": "Email",
  "Parol": "Пароль",
  "Kirish": "Войти",
  "yoki email bilan": "или по email",
  "yoki telefon / email bilan": "или по телефону / email",
  "Telefon yoki email": "Телефон или email",
  "Yaroqli telefon (+998...) yoki email kiriting":
    "Введите корректный телефон (+998...) или email",
  "Telefon yoki email kiriting": "Введите телефон или email",
  "Google orqali kirilmoqda...": "Входим через Google...",
  "Yaroqli email kiriting": "Введите корректный email",
  "Parol kamida 6 ta belgi": "Пароль минимум 6 символов",
  "Kirish rad etildi: admin roli kerak":
    "Доступ запрещён: требуется роль администратора",
  "Faqat adminlar uchun. Seed ma'lumotlari:":
    "Только для администраторов. Тестовые данные:",
  "Xush kelibsiz": "Добро пожаловать",
  "Bepul": "Бесплатно",

  // ── Huquqiy hujjatlar ─────────────────────────────────────────────────
  "Huquqiy hujjatlar": "Юридические документы",
  "Maxfiylik siyosati, foydalanuvchi shartnomasi, oferta va rekvizitlarni boshqaring":
    "Управляйте политикой конфиденциальности, пользовательским соглашением, офертой и реквизитами",
  "Yangi hujjat": "Новый документ",
  "Versiyalar tarixi": "История версий",
  "Barcha statuslar": "Все статусы",
  "Arxiv": "Архив",
  "Versiya": "Версия",
  "Status": "Статус",
  "Nashr qilingan": "Опубликован",
  "Hujjatlar topilmadi": "Документы не найдены",
  "Filtrlarni o'zgartiring yoki yangi hujjat yarating":
    "Измените фильтры или создайте новый документ",
  "Faol versiya hali yaratilmagan": "Активная версия ещё не создана",
  "Yangi versiya": "Новая версия",
  "Hujjatni o'chirish": "Удалить документ",
  "Hujjat o'chirildi": "Документ удалён",
  "Hujjat yangilandi": "Документ обновлён",
  "Faol hujjatni o'chirib bo'lmaydi. Avval uni faolsizlantiring.":
    "Активный документ нельзя удалить. Сначала деактивируйте его.",
  "Hujjatni tahrirlash": "Редактировать документ",
  "Yangi versiya nashr qilish": "Опубликовать новую версию",
  "Eski versiya avtomatik arxivga ko'chiriladi. Foydalanuvchilar yangi versiyaga qaytadan rozilik berishi kerak bo'ladi.":
    "Старая версия автоматически уйдёт в архив. Пользователи должны заново принять новую версию.",
  "UZ va RU tilidagi sarlavha + matnni to'ldiring.":
    "Заполните заголовок и текст на UZ и RU.",
  "Yangi versiya nashr qilinsa: eski versiya arxivga o'tadi, barcha foydalanuvchilar qaytadan rozilik berishi shart bo'ladi.":
    "При публикации новой версии: старая уходит в архив, все пользователи должны заново подтвердить согласие.",
  "Faol versiya": "Активная версия",
  "Yoqilganda foydalanuvchilarga shu versiya ko'rsatiladi. Boshqa faol versiya avtomatik arxivga o'tadi.":
    "При включении пользователям показывается эта версия. Другая активная версия автоматически уходит в архив.",
  "Google tokeni yaroqsiz yoki muddati tugagan. Qayta urinib ko'ring.":
    "Токен Google недействителен или истёк. Попробуйте ещё раз.",
  "Bu akkauntda admin huquqi yo'q.":
    "У этого аккаунта нет прав администратора.",
  "Bu Google akkaunt admin sifatida ro'yxatdan o'tmagan.":
    "Этот Google-аккаунт не зарегистрирован как администратор.",
  "Akkaunt faolsizlantirilgan. Administrator bilan bog'laning.":
    "Аккаунт деактивирован. Свяжитесь с администратором.",
  "Kiritilgan ma'lumot noto'g'ri.": "Введённые данные некорректны.",
  "Telefon/email yoki parol noto'g'ri.":
    "Телефон/email или пароль неверны.",

  // ── Shell / Sidebar ───────────────────────────────────────────────────
  "Admin panel": "Админ-панель",
  "Chiqish": "Выйти",
  "Tilni tanlash": "Выбор языка",
  "Til": "Язык",
  "Mavzu": "Тема",
  "Yorug'": "Светлая",
  "Qorong'u": "Тёмная",
  "Avtomatik": "Системная",

  // Nav groups
  "Bosh": "Главное",
  "Kontent": "Контент",
  "Monetizatsiya": "Монетизация",
  "Operatsiyalar": "Операции",

  // Nav items
  "Dashboard": "Панель",
  "Analitika": "Аналитика",
  "Foydalanuvchilar": "Пользователи",
  "Yosh toifalari": "Возрастные категории",
  "Mashg'ulot toifalari": "Категории тренировок",
  "Darslar": "Уроки",
  "Kitob toifalari": "Категории книг",
  "Kitoblar": "Книги",
  "Masterklass toifalari": "Категории мастер-классов",
  "Masterklasslar": "Мастер-классы",
  "Tariflar": "Тарифы",
  "Obunalar": "Подписки",
  "Xabarnomalar": "Уведомления",
  "Yuklash (R2)": "Загрузки (R2)",

  // ── Dashboard ─────────────────────────────────────────────────────────
  "Platforma ko'rsatkichlari va trendlar":
    "Показатели и тренды платформы",
  "Faol obunalar": "Активные подписки",
  "Daromad (30 kun)": "Выручка (30 дней)",
  "Daromad (oxirgi 30 kun)": "Выручка (последние 30 дней)",
  "Yangi foydalanuvchilar (oxirgi 30 kun)":
    "Новые пользователи (последние 30 дней)",
  "Dars progressi": "Прогресс уроков",
  "AI suhbatlari": "AI чаты",
  "Kutilayotgan tolovlar": "Ожидаемые платежи",
  "Jami": "Всего",
  "Yakunlangan": "Завершено",
  "oxirgi 7 kunda": "за последние 7 дней",

  // ── Common actions / status ───────────────────────────────────────────
  "Saqlash": "Сохранить",
  "Yaratish": "Создать",
  "Qo'shish": "Добавить",
  "Bekor qilish": "Отмена",
  "Tahrirlash": "Редактировать",
  "O'chirish": "Удалить",
  "Tozalash": "Очистить",
  "Yuklash": "Загрузить",
  "Almashtirish": "Заменить",
  "Hammasini tanlash": "Выбрать все",
  "Ha": "Да",
  "Yo'q": "Нет",
  "Qidirish": "Поиск",
  "Filtrlarni tozalash": "Сбросить фильтры",
  "Yopish": "Закрыть",
  "Yangilash": "Обновить",
  "Majburiy": "Обязательно",
  "Yuklanmoqda...": "Загрузка...",
  "Saqlanmoqda...": "Сохранение...",
  "O'chirilmoqda...": "Удаление...",
  "Yuborilmoqda...": "Отправляется...",
  "Faol": "Активно",
  "Nofaol": "Неактивно",
  "Yaratildi": "Создано",
  "Yangilandi": "Обновлено",
  "O'chirildi": "Удалено",

  // ── Common page elements ──────────────────────────────────────────────
  "Hammasi": "Все",
  "Barcha toifalar": "Все категории",
  "Barcha turlar": "Все типы",
  "Barcha yoshlar": "Все возрасты",
  "Barcha yosh toifalari": "Все возрастные категории",
  "Yaratilgan": "Создано",
  "Amallar": "Действия",
  "Tur": "Тип",
  "Toifa": "Категория",
  "Sarlavha": "Заголовок",
  "Sarlavha (UZ)": "Заголовок (UZ)",
  "Sarlavha (RU)": "Заголовок (RU)",
  "Tavsif": "Описание",
  "Tavsif (UZ)": "Описание (UZ)",
  "Tavsif (RU)": "Описание (RU)",
  "Matn (UZ)": "Текст (UZ)",
  "Matn (RU)": "Текст (RU)",
  "Ta'rif (UZ)": "Описание (UZ)",
  "Ta'rif (RU)": "Описание (RU)",
  "Yosh toifasi": "Возрастная категория",
  "Yosh toifasini tanlang": "Выберите возрастную категорию",
  "Toifani tanlang": "Выберите категорию",
  "Mashg'ulot toifasi": "Категория тренировок",

  // ── Empty / errors ────────────────────────────────────────────────────
  "Topilmadi": "Не найдено",
  "Ma'lumot yo'q": "Нет данных",
  "Qayta urinib ko'ring": "Попробуйте ещё раз",
  "Bu amalni bekor qilib bo'lmaydi.":
    "Это действие нельзя отменить.",
  "Filtrlarga mos toifa topilmadi. Filtrlarni tozalab ko'ring.":
    "По заданным фильтрам категорий не найдено. Сбросьте фильтры.",
  "Filtrlarga mos kitob topilmadi. Filtrlarni tozalab ko'ring.":
    "По заданным фильтрам книг не найдено. Сбросьте фильтры.",
  "Filtrlarga mos dars topilmadi. Filtrlarni tozalab ko'ring.":
    "По заданным фильтрам уроков не найдено. Сбросьте фильтры.",

  // ── Page: Age Categories ──────────────────────────────────────────────
  "Trenerlik toifalari uchun yosh diapazonlari":
    "Возрастные диапазоны для тренерских категорий",
  "Yangi toifa": "Новая категория",
  "Yangi yosh toifasi": "Новая возрастная категория",
  "Yosh toifasini tahrirlash": "Редактировать возрастную категорию",
  "Uzbek va rus tillaridagi sarlavha hamda yosh oralig'i":
    "Заголовок на узбекском и русском и возрастной диапазон",
  "Minimal yosh": "Мин. возраст",
  "Maksimal yosh": "Макс. возраст",
  "Maksimal yosh minimal yoshdan katta bo'lishi kerak":
    "Макс. возраст должен быть больше минимального",
  "Ikon (ixtiyoriy)": "Иконка (необязательно)",
  "Toifani o'chirish": "Удалить категорию",
  "Toifalar mavjud emas": "Категорий нет",
  "Birinchi yosh toifasini qo'shing":
    "Добавьте первую возрастную категорию",
  "Yosh oralig'i": "Возрастной диапазон",

  // ── Page: Training Categories ─────────────────────────────────────────
  "Yosh toifasi bo'yicha mashg'ulot turlarini boshqarish":
    "Управление типами тренировок по возрастной категории",
  "Yangi mashg'ulot toifasi": "Новая категория тренировок",
  "Mashg'ulot toifasini tahrirlash": "Редактировать категорию тренировок",
  "Yosh toifasi, sarlavha va tavsiflar":
    "Возрастная категория, заголовок и описания",
  "Toifalar topilmadi": "Категории не найдены",
  "Filtrlarni o'zgartiring yoki yangi toifa qo'shing":
    "Измените фильтры или добавьте новую категорию",
  "Rasm (ixtiyoriy)": "Изображение (необязательно)",

  // ── Page: Book Categories ─────────────────────────────────────────────
  "Kitob va konspekt toifalarini boshqarish":
    "Управление категориями книг и конспектов",
  "Yangi kitob toifasi": "Новая категория книг",
  "Kitob toifasini tahrirlash": "Редактировать категорию книг",
  "Sarlavha va toifa turini kiriting":
    "Введите заголовок и тип категории",
  "Toifa turi": "Тип категории",
  "Kitob": "Книга",
  "Konspekt": "Конспект",
  "Toifani tahrirlash yoki o'chirish":
    "Редактировать или удалить категорию",
  "Sarlavha bo'yicha izlash...": "Поиск по заголовку...",
  "Birinchi kitob toifasini qo'shing":
    "Добавьте первую категорию книг",

  // ── Page: Books ───────────────────────────────────────────────────────
  "Kitob va konspektlarni boshqaring, narx va chegirmalarni sozlang":
    "Управляйте книгами и конспектами, настраивайте цены и скидки",
  "Yangi kitob": "Новая книга",
  "Kitobni tahrirlash": "Редактировать книгу",
  "Kitobni o'chirish": "Удалить книгу",
  "Kitoblar topilmadi": "Книги не найдены",
  "Hali hech qanday kitob yaratilmagan.": "Ни одной книги ещё не создано.",
  "Kitob sarlavhasi bo'yicha izlash...": "Поиск по заголовку книги...",
  "Barcha majburiy maydonlarni to'ldiring va fayllarni yuklang.":
    "Заполните все обязательные поля и загрузите файлы.",
  "Muqova rasmi": "Обложка",
  "PDF fayl *": "PDF файл *",
  "Taktik maslahat rasmi": "Изображение тактической подсказки",
  "Narx va chegirma": "Цена и скидка",
  "Asosiy narx (UZS)": "Базовая цена (UZS)",
  "Chegirma turi": "Тип скидки",
  "Chegirma foizi": "Процент скидки",
  "Belgilangan narx (UZS)": "Фиксированная цена (UZS)",
  "Yakuniy narx:": "Итоговая цена:",
  "Chegirma yo'q": "Без скидки",
  "Foizli chegirma": "Процентная скидка",
  "Belgilangan narx": "Фиксированная цена",
  "Yuklanmagan": "Не загружено",
  "yoki URL qo'lda kiriting": "или введите URL вручную",

  // ── Page: Lessons ─────────────────────────────────────────────────────
  "Mashg'ulot darslarini boshqaring va kontent bloklarini tahrirlang":
    "Управляйте уроками и блоками контента",
  "Yangi dars": "Новый урок",
  "Darsni tahrirlash": "Редактировать урок",
  "Darsni o'chirish": "Удалить урок",
  "Darslar topilmadi": "Уроки не найдены",
  "Hali hech qanday dars yaratilmagan. Boshlash uchun yangi dars qo'shing.":
    "Ни одного урока ещё не создано. Добавьте первый урок.",
  "UZ yoki RU sarlavha bo'yicha izlash...":
    "Поиск по заголовку (UZ или RU)...",
  "UZ va RU tilidagi sarlavhani va tegishli mashg'ulot toifasini kiriting.":
    "Введите заголовок на UZ и RU и соответствующую категорию тренировок.",
  "Darsga birinchi blokni qo'shish uchun pastdagi tugmani bosing.":
    "Нажмите кнопку ниже, чтобы добавить первый блок в урок.",
  "Bloklar yo'q": "Блоков нет",
  "Blok qo'shish": "Добавить блок",
  "Yangi blok": "Новый блок",
  "Blokni tahrirlash": "Редактировать блок",
  "Blokni o'chirish": "Удалить блок",
  "Blok turi": "Тип блока",
  "Tartib raqami": "Порядковый номер",
  "Davomiyligi (soniya, ixtiyoriy)":
    "Длительность (секунды, необязательно)",
  "Yuqoriga": "Вверх",
  "Pastga": "Вниз",

  // Block type labels
  "Sarlavha bloki": "Блок заголовка",
  "Matn": "Текст",
  "Video": "Видео",
  "Rasm": "Изображение",
  "Fayl": "Файл",
  "Maslahat": "Подсказка",

  // ── Page: Plans ───────────────────────────────────────────────────────
  "Obuna tariflari va chegirmalarni boshqarish":
    "Управление тарифами и скидками подписки",
  "Yangi tarif": "Новый тариф",
  "Tarifni tahrirlash": "Редактировать тариф",
  "Tarifni o'chirish": "Удалить тариф",
  "Tariflar mavjud emas": "Тарифы отсутствуют",
  "Birinchi obuna tarifini yarating": "Создайте первый тариф подписки",
  "Davomiylik (kun)": "Длительность (дни)",
  "Aksiya narxi (UZS)": "Акционная цена (UZS)",
  "Faol tarif": "Активный тариф",
  "Yakuniy narx": "Итоговая цена",
  "Foydalanuvchilar faqat faol tariflarni ko'radi":
    "Пользователям видны только активные тарифы",

  // ── Page: Notifications ───────────────────────────────────────────────
  "Foydalanuvchilarga push-xabar yuborish va statistika":
    "Отправка push-уведомлений пользователям и статистика",
  "Yangi xabar": "Новое уведомление",
  "Bir foydalanuvchi": "Один пользователь",
  "Bir nechta": "Несколько",
  "Hammaga yuborish": "Всем",
  "Qabul qiluvchi": "Получатель",
  "Qabul qiluvchilar": "Получатели",
  "Barcha aktiv foydalanuvchilarga yuboriladi":
    "Будет отправлено всем активным пользователям",
  "Foydalanuvchini tanlang...": "Выберите пользователя...",
  "Ism, telefon yoki email bo'yicha izlash...":
    "Поиск по имени, телефону или email...",
  "Foydalanuvchilar topilmadi": "Пользователи не найдены",
  "Jami xabarlar": "Всего уведомлений",
  "O'qilmagan": "Непрочитано",
  "O'qilgan": "Прочитано",
  "Turlar bo'yicha": "По типам",
  "Yuborish": "Отправить",
  "Bog'liq ID (ixtiyoriy)": "Связанный ID (необязательно)",
  "Dars / kitob / obuna kabi obyektga havola":
    "Ссылка на объект: урок / книга / подписка",
  "Bog'liq dars": "Связанный урок",
  "Bog'liq kitob": "Связанная книга",
  "Bog'liq tarif": "Связанный тариф",
  "Bog'liq ob'ekt": "Связанный объект",
  "Ro'yxatdan tanlang — ID avtomatik biriktiriladi":
    "Выберите из списка — ID подставится автоматически",
  "Tanlang...": "Выберите...",
  "Tanlang": "Выберите",
  "Qidirish...": "Поиск...",

  // ── Masterclasses ─────────────────────────────────────────────────────
  "Masterklass toifalarini boshqarish":
    "Управление категориями мастер-классов",
  "Yangi masterklass toifasi": "Новая категория мастер-классов",
  "Masterklass toifasini tahrirlash":
    "Редактировать категорию мастер-классов",
  "Masterklass toifasini o'chirish":
    "Удалить категорию мастер-классов",
  "Birinchi masterklass toifasini qo'shing":
    "Добавьте первую категорию мастер-классов",
  "Masterklass darslari va videolarini boshqaring":
    "Управление мастер-классами и видео",
  "Yangi masterklass": "Новый мастер-класс",
  "Masterklassni tahrirlash": "Редактировать мастер-класс",
  "Masterklassni o'chirish": "Удалить мастер-класс",
  "Masterklasslar topilmadi": "Мастер-классы не найдены",
  "Hali hech qanday masterklass yaratilmagan.":
    "Ни одного мастер-класса ещё не создано.",
  "Masterklass toifasi": "Категория мастер-класса",
  "Masterklass sarlavhasi bo'yicha izlash...":
    "Поиск по заголовку мастер-класса...",
  "Filtrlarga mos masterklass topilmadi. Filtrlarni tozalab ko'ring.":
    "По заданным фильтрам мастер-классов не найдено. Сбросьте фильтры.",
  "Muqova rasmi (ixtiyoriy)": "Обложка (необязательно)",
  "Sarlavha va tavsifni kiriting": "Введите заголовок и описание",
  "Toifa, sarlavha va tavsifni kiriting.":
    "Введите категорию, заголовок и описание.",
  "Masterklassga birinchi blokni qo'shish uchun pastdagi tugmani bosing.":
    "Нажмите кнопку ниже, чтобы добавить первый блок в мастер-класс.",
  "Iltimos, masterklasslar ro'yxatiga qayting.":
    "Пожалуйста, вернитесь к списку мастер-классов.",
  "Yuklandi": "Загружено",
  "Qo'shildi": "Добавлено",
  "turidagi blok kontentini kiriting.":
    "Введите содержимое блока этого типа.",
  "Fayl yuklash": "Загрузить файл",
  "Fayl tanlash": "Выбрать файл",

  // ── Page: Uploads ─────────────────────────────────────────────────────
  "R2 bucket'ga fayl yuklash": "Загрузка файла в R2 bucket",

  // ── Page: Users ───────────────────────────────────────────────────────
  "Ro'yxatdan o'tgan foydalanuvchilarni boshqarish":
    "Управление зарегистрированными пользователями",

  // ── Page: Subscriptions ──────────────────────────────────────────────
  "Foydalanuvchilarning obunalarini ko'rish":
    "Просмотр подписок пользователей",

  // ── Page: Analytics ───────────────────────────────────────────────────
  "Chuqur ko'rsatkichlar va tahlil":
    "Глубокие показатели и аналитика",
  "Platformaning chuqur ko'rsatkichlari va taqsimotlar":
    "Детальные показатели платформы и распределения",
  "Dan": "С",
  "Gacha": "По",
  "Oxirgi 7 kun": "Последние 7 дней",
  "Oxirgi 30 kun": "Последние 30 дней",
  "Oxirgi 90 kun": "Последние 90 дней",
  "Daromad trendi": "Тренд выручки",
  "Daromad": "Выручка",
  "Tolovlar": "Платежи",
  "Tolovlar soni": "Количество платежей",
  "Kunlik o'rtacha": "В среднем за день",
  "Malumot yoq": "Нет данных",
  "Tanlangan oraliqda daromad kirimi topilmadi":
    "За выбранный период поступлений не найдено",
  "Tanlangan oraliqda malumot yo'q": "За выбранный период данных нет",
  "Top darslar (20 ta)": "Топ уроков (20 шт)",
  "Top kitoblar (20 ta)": "Топ книг (20 шт)",
  "Dars": "Урок",
  "Kitob (nom)": "Книга",
  "Kategoriya": "Категория",
  "Yakunlanganlik": "Завершаемость",
  "Sotuvlar": "Продажи",
  "Foydalanuvchilar o'sishi": "Рост пользователей",
  "Kunlik": "Ежедневно",
  "Kumulyativ": "Кумулятивно",
  "Yangi": "Новые",
  "Bildirishnomalar": "Уведомления",
  "Bildirishnomalar yoq": "Уведомлений нет",
  "Oqilgan": "Прочитанные",
  "Oqilmagan": "Непрочитанные",
  "Tizim": "Система",
  "AI chat": "AI чат",
  "Tariflar bo'yicha daromad": "Выручка по тарифам",
  "Jami daromad": "Общая выручка",
  "Tarif malumoti yoq": "Данных о тарифах нет",
  "Umumiy ko'rsatkichlar": "Общие показатели",
  "Yangi (7 kun)": "Новые (7 дней)",
  "Yangi (30 kun)": "Новые (30 дней)",
  "Daromad (7 kun)": "Выручка (7 дней)",
  "Kutilayotgan": "Ожидается",
  "Kitoblar bo'yicha malumot yo'q": "Данных по книгам нет",
  "Darslar bo'yicha malumot yo'q": "Данных по урокам нет",
  "Haftalik": "Еженедельно",
  "Choraklik": "Ежеквартально",
  "Yillik": "Ежегодно",
  "Oylik": "Ежемесячно",

  // ── Page: Subscriptions extras ────────────────────────────────────────
  "Tariflar bo'yicha obuna ko'rsatkichlari va daromad":
    "Показатели подписок и выручка по тарифам",

  // ── Page: Uploads extras ──────────────────────────────────────────────
  "Fayllar menejeri": "Менеджер файлов",
  "R2 obyekt xotirasi — fayllarni yuklash, ulashish va o'chirish":
    "Объектное хранилище R2 — загрузка, ссылки и удаление файлов",

  // ── Users extras ──────────────────────────────────────────────────────
  "Qidirish, tahrirlash yoki o'chirish":
    "Поиск, редактирование или удаление",
  "Ism, email, telefon...": "Имя, email, телефон...",
  "Barchasi": "Все",
  "Ism": "Имя",
  "Telefon": "Телефон",
  "Rol": "Роль",
  "Holat": "Статус",
  "Filtrlarni o'zgartiring yoki qidiruvni bo'shating":
    "Измените фильтры или очистите поиск",
  "Sahifa": "Страница",
  "yangilanmoqda...": "обновляется...",
  "Oldingi": "Назад",
  "Keyingi": "Далее",
  "Sahifada": "На странице",

  // ── Dashboard extras ──────────────────────────────────────────────────
  "Eng faol darslar": "Самые активные уроки",
  "Tarif bo‘yicha obunalar": "Подписки по тарифам",
  "Hozircha darslar ustida faoliyat yo'q":
    "Пока нет активности по урокам",
  "progress": "прогресс",
  "yakunlangan": "завершено",
  "Faol:": "Активно:",
  "Jami:": "Всего:",
};

const DICT: Record<Locale, Record<string, string>> = {
  uz: {},
  ru: RU,
};

export function translate(key: string, locale: Locale): string {
  if (locale === "uz") return key;
  return DICT[locale][key] ?? key;
}

/**
 * Reactive translator hook. Consumers should only ever do `const { t } = useT()`
 * — never call `translate()` directly so re-renders happen on locale change.
 */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return {
    locale,
    t: (key: string) => translate(key, locale),
  };
}

/**
 * Bilingual field picker. Entity objects in this project carry `titleUz`+
 * `titleRu` pairs (and similarly for description/content). These helpers
 * return the field for the user's current locale as the *primary* value and
 * the other locale as the *secondary* (shown as a subtitle).
 */
export function useBiLang() {
  const locale = useLocaleStore((s) => s.locale);
  const primary = (uz?: string | null, ru?: string | null): string =>
    (locale === "ru" ? ru || uz : uz || ru) ?? "";
  const secondary = (uz?: string | null, ru?: string | null): string =>
    (locale === "ru" ? uz || ru : ru || uz) ?? "";
  return { locale, primary, secondary };
}

/**
 * Keeps <html lang="…"> in sync with the selected locale. Mount once in a
 * top-level client wrapper.
 */
export function useSyncHtmlLang() {
  const locale = useLocaleStore((s) => s.locale);
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);
}
