const soundFolder = 'assets/audio';


const soundVariants = {
    'answer-correct': 5,
    'answer-typo': 3,
    'answer-wrong': 1,
    'game-completed': 4
}

const sounds = {};

for(let [name, variants] of Object.entries(soundVariants)) {
    for(let variant = 0; variant < variants; variant += 1) {
        sounds[`${name}-${variant}`] = new Audio(`${soundFolder}/${name}-${variant}.mp3`);
    }
}

const complimentMessages = [
    "Браво!", "Отлично сыграно!", "Неплохо!", "Молодец!",
    "Не верим своим глазам!", "Ура!", "Супер!", "Круто!",
    "Ты на высоте", "Ты просто супер!", "Правильно!",
    "Тебя не остановить!", "Ха, слишком легко!",
    "Не останавливайся!", "Ты умница!", "Ты просто непобедим!",
    "Ты на верном пути к успеху!", "Хорошая работа!",
];

const typoMessages = [
    "Всё хорошо, но внимательнее!", "Только одна буква, это близко к совершенству",
    "Почти идеально", "Опечатки бывают у всех, не расстраивайся!",
    "Ой, опечаточка, но ничего!", "Немножко неточно"
];

const wrongAnswerMessages = [
    "Из ошибок тоже можно извлечь уроки", "Маленькие ошибки никогда тебя не остановят",
    "Сделай глубокий вдох и продолжай", "Не переживай, ошибаться - это нормально",
    "Нет ошибок, только опыт!", "Нельзя достичь успеха без ошибок",
    "Помни, что научиться чему-то новому требутся время и терпение",
    "Хм, это был сложный вопрос!"
];

function getRandomElement(array) {
    return array[randomInt(0, array.length - 1)];
}

function getWrongAnswerMessage() {
    return getRandomElement(wrongAnswerMessages);
}

function getComplimentMessage() {
    return getRandomElement(complimentMessages);
}

function getTypoMessage() {
    return getRandomElement(typoMessages);
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

function playSound(soundName) {
    if(!soundVariants.hasOwnProperty(soundName)) {
        throw new Error(`No such sound registered with name ${soundName}. Please, add it to SOUND_VARIANTS array.`);
    }

    const variant = randomInt(0, soundVariants[soundName]);
    sounds[`${soundName}-${variant}`].play();
}

const levenshteinDistance = (s, t) => {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr = [];
    for (let i = 0; i <= t.length; i++) {
        arr[i] = [i];
        for (let j = 1; j <= s.length; j++) {
            arr[i][j] = i === 0 ? j : Math.min(arr[i - 1][j] + 1, arr[i][j - 1] + 1, arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1));
        }
    }
    return arr[t.length][s.length];
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

class Verb {
    constructor(infinitive, present, past, perfect, translation, note) {
        this.infinitive = infinitive;
        this.present = present;
        this.past = past;
        this.perfect = perfect;
        this.translation = translation;
        this.note = note;
    }
}

class Question {
    constructor(question, verb, verbType, word, answer, note) {
        this.question = question;
        this.verb = verb;
        this.verbType = verbType;
        this.word = word;
        this.answer = answer;
        this.note = note;
    }

    checkAnswer(userAnswer, validationCallback) {
        if(this.hasMultipleAnswers()) {
            for(let correctAnswer of this.answer) {
                if(validationCallback(correctAnswer)) {
                    return true;
                }
            }
            return false;
        }

        return validationCallback(this.answer);
    }

    isCorrectAnswer(userAnswer) {
        return this.checkAnswer(userAnswer, correctAnswer => userAnswer === correctAnswer);
    }

    isTypoAnswer(userAnswer) {
        return this.checkAnswer(userAnswer, correctAnswer => levenshteinDistance(userAnswer, correctAnswer) === 1);
    }

    hasMultipleAnswers() {
        return Array.isArray(this.answer);
    }

    getAllAnswersCommaSeparated() {
        return this.hasMultipleAnswers() ? this.answer.join(", ") : this.answer;
    }

    getAllAnswersMessage() {
        return `Все возможные варианты ответа: ${ this.getAllAnswersCommaSeparated() }`
    }

    getTheMostUsedAnswer() {
        return this.hasMultipleAnswers() ? this.answer[0] : this.answer;
    }
}

class VerbSet {
    constructor(name, ...verbs) {
        this.name = name;
        this.verbs = verbs;
    }

    makeQuestions() {
        const questions = [];

        shuffle(this.verbs);

        for(let verb of this.verbs) {
            questions.push(new Question("Как сказать это слово по-норвежски?", verb, 'infinitive', verb.translation, verb.infinitive, verb.note));
            questions.push(new Question("А как сказать это слово в настоящем времени?", verb, 'present', verb.infinitive, verb.present, `Перевод слова - ${verb.translation}`));
            questions.push(new Question("Как будет это слово в прошедшем времени?", verb, 'past', verb.infinitive, verb.past, `Перевод слова - ${verb.translation}`));
            questions.push(new Question("А в Present Perfect (напиши ответ без har)?", verb, 'perfect', verb.infinitive, verb.perfect, `Перевод слова - ${verb.translation}`));
        }

        return questions;
    }

    getSubtitleMessage() {
        return `Набор слов "${this.name}" · Lykke til!`;
    }
}

class GameStatistics {
    static VERB_TYPES = ['infinitive', 'present', 'past', 'perfect'];
    static ANSWER_TYPES = ['correct', 'typo', 'incorrect'];

    constructor(set) {
        this.set = set;
        this.statistics = {};

        for(let verb of this.set.verbs.map(v => v.infinitive)) {
            this.statistics[verb] = {};

            for (let existingVerbType of GameStatistics.VERB_TYPES) {
                this.statistics[verb][existingVerbType] = 'unanswered';
            }
        }
    }

    addStatistic(verb, verbType, answerType) {
        if(!this.statistics.hasOwnProperty(verb)) {
            this.statistics[verb] = {};
        }

        this.statistics[verb][verbType] = answerType;
    }

    calculatePercent() {
        const questionCount = this.set.verbs.length * GameStatistics.VERB_TYPES.length;
        let percent = 0;

        for(let verb of this.set.verbs.map(v => v.infinitive)) {
            for(let verbType of GameStatistics.VERB_TYPES) {
                const isAnswerCorrect = this.statistics[verb][verbType] === 'incorrect' || this.statistics[verb][verbType] === 'unanswered';

                percent += (isAnswerCorrect ? 0 : 1) / questionCount * 100;
            }
        }

        return percent;
    }

    calculateRank() {
        const percent = this.calculatePercent();

        if(percent >= 90.0) {
            return "S";
        }

        if(percent >= 75.0) {
            return "A";
        }

        if(percent >= 60.0) {
            return "B";
        }

        return "C";
    }
}

const sets = [new VerbSet("1",
        new Verb("arbeide", "arbeider", "arbeidet", "arbeidet", "Работать"),
        new Verb("begynne", "begynner", "begynte", "begynt", "Начинать"),
        new Verb("bestemme", "bestemmer", "bestemte", "bestemt", "Решать"),
        new Verb("besøke", "besøker", "besøkte", "besøkt", "Посещать"),
        new Verb("betale", "betaler", "betalte", "betalt", "Платить"),
    ),

    new VerbSet("2",
        new Verb("bli", "blir", ["ble", "blei"], "blitt", "Становиться"),
        new Verb("bo", "bor", "bodde", "bodd", "Проживать"),
        new Verb("bringe", "bringer", "brakte", "brakt", "Приносить"),
        new Verb("bruke", "bruker", "brukte", "brukt", "Использовать"),
    ),

    new VerbSet("3",
        new Verb("burde", "bør", "burde", "burdet", "Следует"),
        new Verb("bære", "bærer", "bar", "båret", "Нести"),
        new Verb("dele", "deler", "delte", "delt", "Разделять"),
        new Verb(["dra", "drage"], ["drar", "drager"], "drog", ["dradd", "dratt"], "Тащить"),
        new Verb("drepe", "dreper", "drepte", "drept", "Убивать"),
    ),

    new VerbSet("4",
        new Verb("drikke", "drikker", "drakk", "drukket", "Пить"),
        new Verb("drive", "driver", ["drev", "dreiv"], "drevet", "Оперировать"),
        new Verb("dø", "dør", ["dødde", "døde"], "dødd", "Умирать"),
        new Verb("eie", "eier", ["eide", "åtte"], ["eid", "ått"], "Владеть"),
    ),

    new VerbSet("5",
        new Verb("falle", "faller", "falt", "falt", "Падать"),
        new Verb("finnes", "finnes", "fantes", "fantes", "Существовать"),
        new Verb("finne", "finner", "fant", "funnet", "Находить"),
        new Verb("foretrekke", "foretrekker", "foretrakk", "foretrukket", "Предпочитать"),
        new Verb("forklare", "forklarer", "forklarte", "forklart", "Объяснять"),
    ),

    new VerbSet("6",
        new Verb("forstå", "forstår", "forstod", "forstått", "Понимать"),
        new Verb("fortelle", "forteller", "fortalte", "fortalt", "Рассказывать"),
        new Verb("få", "får", "fikk", "fått", "Получать"),
        new Verb("gi", "gir", "gav", "gitt", "Давать"),
    ),

    new VerbSet("7",
        new Verb("gjelde", "gjelder", ["gjaldt", "galdt"], "gjeldt", "Быть актуальным"),
        new Verb("gjøre", "gjør", "gjorde", "gjort", "Делать"),
        new Verb("glemme", "glemmer", "glemte", "glemt", "Забыть"),
        new Verb("gå", "går", "gikk", "gått", "Идти"),
        new Verb("ha", "har", "hadde", "hatt", "Иметь"),
    ),

    new VerbSet("8",
        new Verb("handle", "handler", "handlet", "handlet", "Делать покупки"),
        new Verb("hende", "hender", "hendte", "hendt", "Случаться"),
        new Verb("hente", "henter", "hentet", "hendt", "Приносить"),
        new Verb("hete", "heter", ["het", "hette"], "hett", "Звать"),
    ),

    new VerbSet("9",
        new Verb("hjelpe", "hjelper", "hjalp", "hjulpet", "Помогать"),
        new Verb("holde", "holder", "holdt", "holdt", "Держать"),
        new Verb("huske", "husker", "husket", "husket", "Помнить"),
        new Verb("høre", "hører", "hørte", "hørt", "Слышать"),
        new Verb("interessere", "interesserer", "interesserte", "interessert", "Интересоваться"),
    ),

    new VerbSet("10",
        new Verb("jobbe", "jobber", "jobbet", "jobbet", "Работать"),
        new Verb("kjenne", "kjenner", "kjente", "kjent", "Знать", "О человеке/месте"),
        new Verb("kjøpe", "kjøper", "kjøpte", "kjøpt", "Покупать"),
        new Verb("kjøre", "kjører", "kjørte", "kjørt", "Водить"),
    ),

    new VerbSet("11",
        new Verb("komme", "kommer", "kom", "kommet", "Приходить"),
        new Verb("koste", "koster", ["kostet", "kosta"], "kostet", "Стоить"),
        new Verb("kunne", "kan", "kunne", "kunnet", "Мочь"),
        new Verb("la", "lar", "lot", "latt", "Позволить"),
        new Verb("lage", "lager", ["laget", "laga", "lagde"], ["laget", "laga", "lagd"], "Создавать"),
    ),

    new VerbSet("12",
        new Verb("legge", "legge", "la", "lagt", "Класть"),
        new Verb("lese", "leser", "leste", "lest", "Читать"),
        new Verb("leve", "lever", "levde", "levd", "Жить"),
        new Verb("ligge", "ligger", "lå", "ligget", "Лежать"),
    ),

    new VerbSet("13",
        new Verb(["ligne", "likne"], ["ligner", "likner"], ["lignet", "liknet"], ["lignet", "liknet"], "Быть похожим"),
        new Verb("like", "liker", "likte", "likt", "Нравиться"),
        new Verb("lære", "lærer", "lærte", "lært", "Учить"),
        new Verb("løpe", "løper", "løp", ["løpt", "løpet"], "Бежать"),
        new Verb("melde", "melder", "meldte", "meldt", "Анонсировать"),
    ),

    new VerbSet("14",
        new Verb("mene", "mener", "mente", "ment", "Иметь в виду"),
        new Verb("møte", "møter", "møtte", "møtt", "Встречать"),
        new Verb("måtte", "må", "måtte", "måttet", "Должен"),
        new Verb("prøve", "prøver", "prøvde", "prøvd", "Пробовать", "Совершать попытку"),
    ),

    new VerbSet("15",
        new Verb("reise", "reiser", "reiste", "reist", "Путешествовать"),
        new Verb("se", "ser", "så", "sett", "Видеть"),
        new Verb("selge", "selger", "solgte", "solgt", "Продавать"),
        new Verb("sende", "sender", "sendte", "sendt", "Отправлять"),
        new Verb("sette", "setter", "satte", "satt", "Устанавливать"),
    ),

    new VerbSet("16",
        new Verb("si", "*sier", "sa", "sagt", "Сказать"),
        new Verb("sitte", "sitter", "satt", "sittet", "Сесть"),
        new Verb("skje", "skjer", "skjedde", "skjedd", "Случаться"),
        new Verb("skrive", "skriver", "skrev", "skrevet", "Писать"),
    ),

    new VerbSet("17",
        new Verb("skulle", "skal", "skulle", "skullet", "Следует"),
        new Verb("slå", "slår", "slo", "slått", "Ударить"),
        new Verb("slåss", "slåss", "sloss", "slåss", "Драться"),
        new Verb("sove", "sover", "sov", "sovet", "Спать"),
        new Verb("spørre", "spør", "spurte", "spurt", "Спросить"),
    ),

    new VerbSet("18",
        new Verb("stå", "står", "stod", "stått", "Стоять"),
        new Verb("synes", ["synes", "syns"], "syntes", ["synes", "syns"], "Думать"),
        new Verb("søke", "søker", "søkte", "søkt", "Искать"),
        new Verb("ta", "tar", "tok", "tatt", "Брать"),
    ),

    new VerbSet("19",
        new Verb("tenke", "tenker", "tenkte", "tenkt", "Думать"),
        new Verb("treffe", "treffer", "traff", "truffet", "Встречать"),
        new Verb("trives", "trives", "trivdes", ["trives", "trivs"], "Наслаждаться"),
        new Verb("tro", "tror", "trodde", "trodd", "Надеяться"),
        new Verb("vente", "venter", "ventet", "ventet", "Ждать"),
        new Verb("ville", "vil", "ville", "villet", "Хотеть"),
    ),

    new VerbSet("20",
        new Verb("vise", "viser", "viste", "vist", "Показывать"),
        new Verb("vite", "vet", "visste", "visst", "Знать"),
        new Verb("være", "er", "var", "vært", "Быть"),
        new Verb("ønske", "ønsker", "ønsket", "ønsket", "Хотеть"),
        new Verb("åpne", "åpner", "åpnet", "åpnet", "Открывать"),
    )
];

class IrregularVerbsUI {
    static CORRECT_CARD_CLASS_CLEANING_AFTER_MS = 1500;
    static TYPO_CARD_CLASS_CLEANING_AFTER_MS = 3000;
    static WRONG_CARD_CLASS_CLEANING_AFTER_MS = 3000;

    constructor(...sets) {
        this.sets = sets;

        this.gameContainerEl = document.getElementById('game-container');
        this.wordCardEl = document.getElementById('word-card');
        this.gameProgressEl = document.getElementById('game-progress');
        this.wordCardTitleEl = document.getElementById('word-card-title');
        this.wordCardWordEl = document.getElementById('word-card-word');
        this.wordCardSubtitleEl = document.getElementById('word-card-subtitle');
        this.wordInputEl = document.getElementById('word-input');
        this.sendWordButtonEl = document.getElementById('send-word-button');

        this.gameContainerEl.style.display = 'flex';
    }

    startGame(setName) {
        this.set = this.sets.find(e => e.name === setName);

        if(this.set === undefined) {
            throw new Error(`There is no such set with name ${setName}.`);
        }

        this.statistics = new GameStatistics(this.set);
        this.questions = this.set.makeQuestions();
        this.questionIndex = 0;

        this.showCurrentQuestion();

        this.sendWordButtonEl.onclick = () => this.checkAnswer();
        this.wordInputEl.onkeydown = (event) => {
            if(event.key === "Enter") {
                this.checkAnswer();
            }
        }
    }

    showCurrentQuestion() {
        const question = this.getCurrentQuestion();

        if(this.noQuestionsLeft()) {
            this.completeGame();
        } else {
            this.clearUserAnswer();
            this.changeState({
                title: question.question,
                word: question.word,
                subtitle: question.note ?? this.set.getSubtitleMessage()
            }).then(() => {
                this.setUserAnswerEditable(true);
            });
        }
    }

    getUserAnswer() {
        return this.wordInputEl.value.toLowerCase();
    }

    clearUserAnswer() {
        this.wordInputEl.value = '';
    }

    getCurrentQuestion() {
        return this.questions[this.questionIndex]
    }

    setUserAnswerEditable(isEditable) {
        this.wordInputEl.disabled = !isEditable;
        this.sendWordButtonEl.disabled = !isEditable;

        if(isEditable) {
            setTimeout(() => this.wordInputEl.focus(), 0);
        }
    }

    checkAnswer() {
        const question = this.getCurrentQuestion();
        const answer = this.getUserAnswer();

        // TODO: Repeated code
        if(question.isCorrectAnswer(answer)) {
            this.statistics.addStatistic(question.verb.infinitive, question.verbType, 'correct');
            this.showMessageAboutCorrectAnswer(question, answer).then(() => this.showCurrentQuestion());
        } else if(question.isTypoAnswer(answer)) {
            this.statistics.addStatistic(question.verb.infinitive, question.verbType, 'typo');
            this.showMessageAboutTypoAnswer(question).then(() => this.showCurrentQuestion());
        } else {
            this.statistics.addStatistic(question.verb.infinitive, question.verbType, 'incorrect');
            this.showMessageAboutWrongAnswer(question).then(() => this.showCurrentQuestion());
        }

        if(this.itWasTheLastQuestion()) {
            this.completeGame();
        } else {
            this.moveToTheNextQuestion();
        }
    }

    completeGame() {
        playSound("game-completed");
        new GameResultUI(this.statistics);
    }

    moveToTheNextQuestion() {
        if(this.itWasTheLastQuestion()) {
            throw new Error(`It was the last question, but moveToTheNextQuestion() was called.`);
        }

        this.questionIndex += 1;
    }

    itWasTheLastQuestion() {
        return this.questionIndex - 1 === this.questions.length;
    }

    noQuestionsLeft() {
        return this.questionIndex >= this.questions.length;
    }

    showMessageAboutWrongAnswer(question) {
        this.setUserAnswerEditable(false);
        return this.changeState({
            title: getWrongAnswerMessage(),
            word: question.getTheMostUsedAnswer(),
            subtitle: question.getAllAnswersMessage(),
            cardClass: 'wrong',
            sound: 'answer-wrong',
            resetDelay: IrregularVerbsUI.WRONG_CARD_CLASS_CLEANING_AFTER_MS
        });
    }

    showMessageAboutTypoAnswer(question) {
        this.setUserAnswerEditable(false);
        return this.changeState({
            title: getTypoMessage(),
            word: question.getTheMostUsedAnswer(),
            subtitle: question.getAllAnswersMessage(),
            cardClass: 'typo',
            sound: 'answer-typo',
            resetDelay: IrregularVerbsUI.TYPO_CARD_CLASS_CLEANING_AFTER_MS
        });
    }

    showMessageAboutCorrectAnswer(question, answer) {
        this.setUserAnswerEditable(false);
        return this.changeState({
            title: getComplimentMessage(),
            word: answer.toLowerCase(),
            subtitle: question.getAllAnswersMessage(),
            cardClass: 'correct',
            sound: 'answer-correct',
            resetDelay: IrregularVerbsUI.CORRECT_CARD_CLASS_CLEANING_AFTER_MS
        });
    }

    changeState({ progress, title, word, subtitle, cardClass, sound, resetDelay }) {
        this.gameProgressEl.innerText = progress ?? this.getProgressMessage();
        this.wordCardTitleEl.innerText = title;
        this.wordCardWordEl.innerText = word;
        this.wordCardSubtitleEl.innerText = subtitle;

        return new Promise((resolve) => {
            if(cardClass === undefined) {
                this.wordCardEl.className = "";
            } else {
                this.wordCardEl.classList.add(cardClass);
            }

            if(resetDelay !== undefined) {
                setTimeout(resolve, resetDelay);
            } else {
                resolve();
            }

            if(sound !== undefined) {
                playSound(sound);
            }
        });
    }

    getProgressMessage() {
        return `${ this.questionIndex + 1 } вопрос из ${ this.questions.length }`;
    }
}

class SetSelectionUI {
    constructor() {
        this.setSelectionContainerEl = document.getElementById('set-selection-container');
        this.setSelectionContainerEl.className = "";

        this.setCardsEl = document.getElementById('set-cards');

        for(let set of sets) {
            const setCardEl = this.makeSetCardEl(set.name);
            this.setCardsEl.appendChild(setCardEl);
        }
    }

    makeSetCardEl(name) {
        const setCardEl = document.createElement('span');
        setCardEl.classList.add('set-card');
        setCardEl.innerText = name;
        setCardEl.onclick = () => {
            this.hide().then(() => {
                new IrregularVerbsUI(...sets).startGame(name);
            });
        }

        return setCardEl;
    }

    hide() {
        return new Promise(resolve => {
            this.setSelectionContainerEl.classList.add('removed');

            setTimeout(() => {
                this.setSelectionContainerEl.style.display = 'none';
                resolve();
            }, 500);
        });
    }
}

class GameResultUI {
    constructor(statistics) {
        console.log(statistics);

        this.gameResultContainerEl = document.getElementById('game-result-container');
        this.gameResultCardEl = document.getElementById('game-result-card');
        this.gameResultRankEl = document.getElementById('game-result-rank');
        this.gameResultTitleEl = document.getElementById('game-result-title');
        this.gameResultPercentEl = document.getElementById('game-result-percent');
        this.gameResultBackButtonEl = document.getElementById('game-result-back-button');

        this.gameResultContainerEl.style.display = 'flex';
        this.gameResultRankEl.classList.add(statistics.calculateRank().toLowerCase());

        this.gameResultBackButtonEl.onclick = () => {
            window.location.reload();
        }

        this.gameResultPercentEl.innerText = `${Math.round(statistics.calculatePercent())}%`;
    }
}

new SetSelectionUI();