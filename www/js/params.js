//all params used
var params = {
    days: [
        { num: 1, ru: "Пн", en: "Mon" },
        { num: 2, ru: "Вт", en: "Tue" },
        { num: 3, ru: "Ср", en: "Wed" },
        { num: 4, ru: "Чт", en: "Thu" },
        { num: 5, ru: "Пт", en: "Fri" },
        { num: 6, ru: "Сб", en: "Sat" },
        { num: 0, ru: "Вс", en: "Sun" }
    ],
    months: [
        { days: 31, short: { ru: "Янв", en: "Jan"}, long: { ru: "Января", en: "Jan"} },
        { days: 28, short: { ru: "Фев", en: "Feb"}, long: { ru: "Февраля", en: "February"} },
        { days: 31, short: { ru: "Мар", en: "Mar"}, long: { ru: "Марта", en: "March"} },
        { days: 30, short: { ru: "Апр", en: "Apr"}, long: { ru: "Апреля", en: "April"} },
        { days: 31, short: { ru: "Май", en: "May"}, long: { ru: "Мая", en: "May"} },
        { days: 30, short: { ru: "Июн", en: "Jun"}, long: { ru: "Июня", en: "June"} },
        { days: 31, short: { ru: "Июл", en: "Jul"}, long: { ru: "Июля", en: "July"} },
        { days: 31, short: { ru: "Авг", en: "Aug"}, long: { ru: "Августа", en: "August"} },
        { days: 30, short: { ru: "Сен", en: "Sep"}, long: { ru: "Сентября", en: "September"} },
        { days: 31, short: { ru: "Окт", en: "Oct"}, long: { ru: "Октября", en: "October"} },
        { days: 30, short: { ru: "Ноя", en: "Nov"}, long: { ru: "Ноября", en: "November"} },
        { days: 31, short: { ru: "Дек", en: "Dec"}, long: { ru: "Декабря", en: "December"} }
    ],
    colors: {
        base: "#00eeec",
        selected: "#FFFFFF",
        route: "#FFFFFF",
        months: [
            "#FFFFFF",
            "#FFFFFF",
            "#FFFFFF",
            "#FFFFFF",
            "#FFFFFF",
            "#10E0A1", //june
            "#F8E71C", //july
            "#C979D9", //august
            "#C979D9", //september
            "#C979D9", //october
            "#C979D9", //november
            "#FFFFFF" //december
        ],
        background: "#444444",
        hot: "#BD3535",
        warm: "#CC7832",
        normal: "#CDA86A",
        chilly: "#64A2A2",
        cold: "#7587A6",
        darkbg: "#222222"
    },
    labels: {
        docTitle: { ru: "Статистика поездок на Велобайках по Москве. Статистика велопрокатов в Москве за 2014", en: "Bike share stats in Moscow, season 2014"},
        newProject: { ru: "Проект 2015 →", en: "2015 project →" },
        menuRoutes: { ru: "Маршруты", en: "Routes" },
        menuHeatmap: { ru: "Активность", en: "Activity" },
        menuCalendar: { ru: "Календарь", en: "Timeline" },
        menuAbout: { ru: "О проекте", en: "About" },
        hcDays: { ru: "Дни", en: "Days" },
        hcHours: { ru: "Часы", en: "Hours" },
        activity: { ru: "Активность за день", en: "Activity per day"},
        temperature: { ru: "Температура воздуха,°C", en: "Temperature,°C"},
        rain: { ru: "Дождь", en: "Rain"},
        rentsPerHour: { ru: "в час", en: "rides per hour"},
        rentsPerDay: { ru: "в день", en: "per day"},
        switchLang: { ru: "in English", en: "По-русски" },
        switchLangShort: { ru: "En", en: "Рус" },
        about: { ru: "О проекте", en: "About" },
        loaderWelcome: { ru: "Поездки на Велобайках в Москве", en: "Bike shares in Moscow"},
        loaderWelcome2: { ru: "Stats c 9 июня по 11 ноября 2014", en: "Stats from 9 June to 11 November 2014"},
        stateLoading: { ru: "Загружаем данные", en: "Loading data" },
        stateAnalyzing: { ru: "Анализируем", en: "Analyzing data" },
        stateMapping: { ru: "Добавляем на карту", en: "Adding data on map" },
        stateDone: { ru: "Готово!", en: "Done" },
        roundtrip: { ru: "Возврат на ту же станцию", en: "Return at the same station"},
        totalTrips: { ru: "всего", en: "total"},
        activitiesByDay: { ru: "Активность станции по дням", en: "Station activity by days"},
        activitiesByHour: { ru: "Активность станции по часам", en: "Station activity by hours"},
        baseDirections: { ru: "Основные направления", en: "Base directions"},
        totalHeatmap: { ru: "Всего", en: "Total"},
        since: { ru: "c ", en: "since " },
        rides: {ru: "поездок", en: "rides"},
        rides1: {ru: "поездкa", en: "ride"},
        rides2: {ru: "поездки", en: "rides"}
    }
};
