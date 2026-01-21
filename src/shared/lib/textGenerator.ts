const random = <T,>(arr: readonly T[]): T => {
  const index = Math.floor(Math.random() * arr.length)
  return arr[index]
}

const TOPICS = [
  'React',
  'Node.js',
  'Python',
  'алгоритмы',
  'архитектура',
  'frontend',
  'backend',
  'HTML',
  'CSS',
  'API',
] as const

const VERBS = [
  'используется',
  'позволяет',
  'оптимизирует',
  'обрабатывает',
  'упрощает',
  'управляет',
  'подключает',
] as const

const NOUNS = [
  'данные',
  'компоненты',
  'потоки',
  'состояние',
  'интерфейс',
  'структуру',
  'запросы',
  'модуль',
] as const

const INTROS = [
  'Рассмотрим пример,',
  'В этом разделе описано,',
  'Для наглядности создадим функцию,',
  'Важно понимать, что',
  'При этом стоит отметить, что',
] as const

const DETAILS = [
  'Код должен оставаться чистым и расширяемым.',
  'Важно избегать жёстких связей между модулями.',
  'Чтение кода важнее его написания.',
  'Стратегия кеширования напрямую влияет на латентность.',
  'Грамотная типизация снижает количество ошибок на проде.',
] as const

const EMPHASIS = [
  '**важно документировать решения**',
  '_контракты API лучше согласовывать заранее_',
  '***архитектура держится на прозрачных интерфейсах***',
  '**типизация экономит время ревьюеров**',
  '_стриминг должен быть без фризов UI_',
  '***React hooks*** требуют аккуратности с зависимостями',
] as const

const LIST_ITEMS = [
  '- продумать контракт функции заранее;',
  '- избегать лишних побочных эффектов;',
  '- разделять доменную и инфраструктурную логику;',
  '- покрывать критичный код тестами;',
  '- логировать только то, что помогает отладке.',
] as const

const CODE_SNIPPETS = [
  `function sum(a, b) {\n  return a + b;\n}`,
  `const user = { name: "Alice", age: 25 };\nconsole.log(user);`,
  `class Storage {\n  constructor() {\n    this.items = [];\n  }\n  add(item) {\n    this.items.push(item);\n  }\n}`,
  `async function fetchData(url) {\n  const res = await fetch(url);\n  return await res.json();\n}`,
  `useEffect(() => {\n  console.log('Компонент отрендерился');\n}, []);`,
] as const

const countWords = (text: string): number => {
  const trimmed = text.trim()
  if (trimmed === '') {
    return 0
  }
  return trimmed.split(/\s+/).length
}

const buildParagraph = (): string => {
  const topic = random(TOPICS)

  const paragraph =
    `${random(INTROS)} ${topic} ${random(VERBS)} ${random(NOUNS)}. ` +
    `Часто для этого применяются приёмы, которые делают архитектуру более предсказуемой. ` +
    `Например, при работе с ${topic} имеет смысл выделять отдельные слои и ограничивать точку входа.` +
    ` ${random(DETAILS)} ${random(EMPHASIS)}.`

  // Иногда добавим небольшой список, чтобы больше походить на dev-ответ
  if (Math.random() < 0.25) {
    return `${paragraph}\n\n${random(LIST_ITEMS)}`
  }

  return paragraph
}

const buildCodeBlock = (): string => {
  const code = random(CODE_SNIPPETS)
  return `\n\`\`\`javascript\n${code}\n\`\`\`\n`
}

export const generateTextWithCode = (wordCount = 10_000): string => {
  const result: string[] = []
  let wordsGenerated = 0

  while (wordsGenerated < wordCount) {
    const paragraph = buildParagraph()
    result.push(paragraph)
    wordsGenerated += countWords(paragraph)

    if (Math.random() < 0.3) {
      const codeBlock = buildCodeBlock()
      result.push(codeBlock)
      wordsGenerated += countWords(codeBlock)
    }
  }

  return result.join('\n\n')
}

export const createInitialHistorySamples = (count: number): string[] => {
  const samples: string[] = []

  for (let index = 0; index < count; index += 1) {
    const words = 60 + (index % 4) * 40
    samples.push(generateTextWithCode(words))
  }

  return samples
}

export type TTextChunkGenerator = {
  nextChunk: (wordBudget: number) => { text: string; words: number } | null
}

export const createTextChunkGenerator = (targetWords: number): TTextChunkGenerator => {
  let currentParagraphWords: string[] = []
  let paragraphWordIndex = 0
  let wordsGeneratedTotal = 0
  let paragraphsGenerated = 0
  let isPendingCodeBlock = false

  const fillParagraph = () => {
    const paragraph = buildParagraph()
    currentParagraphWords = paragraph.split(/\s+/)
    paragraphWordIndex = 0
    paragraphsGenerated += 1
    isPendingCodeBlock = Math.random() < 0.3 && paragraphsGenerated % 3 !== 0
  }

  const takeParagraphWords = (wordBudget: number) => {
    if (currentParagraphWords.length === 0 || paragraphWordIndex >= currentParagraphWords.length) {
      fillParagraph()
    }

    const endIndex = Math.min(currentParagraphWords.length, paragraphWordIndex + wordBudget)
    const chunkWords = currentParagraphWords.slice(paragraphWordIndex, endIndex)
    paragraphWordIndex = endIndex

    const isParagraphFinished = paragraphWordIndex >= currentParagraphWords.length
    const suffix = isParagraphFinished ? '\n\n' : ' '

    return {
      text: `${chunkWords.join(' ')}${suffix}`,
      words: chunkWords.length,
      isParagraphFinished,
    }
  }

  return {
    nextChunk: (wordBudget: number) => {
      if (wordsGeneratedTotal >= targetWords) {
        return null
      }

      if (isPendingCodeBlock) {
        isPendingCodeBlock = false
        const codeBlock = buildCodeBlock()
        const words = countWords(codeBlock)
        wordsGeneratedTotal += words
        return { text: `${codeBlock}\n`, words }
      }

      const safeBudget = Math.max(1, wordBudget)
      const taken = takeParagraphWords(safeBudget)
      wordsGeneratedTotal += taken.words

      return { text: taken.text, words: taken.words }
    },
  }
}

