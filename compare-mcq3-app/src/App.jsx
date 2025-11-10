import { useEffect, useMemo, useState } from 'react'
import promptMetadata from './data/mcq3SystemInstructions.json'
import './App.css'

const PAGE_SIZE = 10
const TYPE_SOURCES = [
  { typeId: '1', filename: 'news_mcq3_with_gemma3_type1_sample50.jsonl' },
  { typeId: '7', filename: 'news_mcq3_with_gemma3_type7_sample50.jsonl' },
  { typeId: '9', filename: 'news_mcq3_with_gemma3_type9_sample50.jsonl' }
]
const TYPE_PROMPT_INFO = promptMetadata?.types ?? {}

const parseJsonl = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch (error) {
        console.warn('JSONL parse error, skipping line:', error)
        return null
      }
    })
    .filter(Boolean)

const ArticleContent = ({ content }) => {
  if (!content) {
    return <p className="article-body muted">コンテンツが見つかりません。</p>
  }

  return (
    <div className="article-body">
      {content.split(/\n+/).map((paragraph, idx) => (
        <p key={idx}>{paragraph}</p>
      ))}
    </div>
  )
}

const QuestionDrawer = ({ typeId, questions, promptInfo }) => {
  const hasQuestions = Array.isArray(questions) && questions.length > 0
  const promptSummary = promptInfo?.typeSpecificInstructions?.length
    ? promptInfo.typeSpecificInstructions
    : promptInfo?.systemInstructions ?? []

  return (
    <details open className={`drawer ${hasQuestions ? '' : 'drawer--empty'}`}>
      <summary>
        <div className="drawer-title">
          <span>Type {typeId}</span>
          {promptSummary.length > 0 && (
            <span className="drawer-subtitle">{promptSummary.join(' ／ ')}</span>
          )}
        </div>
        <span className="drawer-count">
          {hasQuestions ? `${questions.length}問` : 'データなし'}
        </span>
      </summary>
      {hasQuestions && (
        <div className="drawer-content">
          {questions.map((qa, index) => (
            <div key={qa.question + index} className="question-block">
              <p className="question-text">
                Q{index + 1}. {qa.question}
              </p>
              <ol>
                {qa.choices?.map((choice, choiceIndex) => (
                  <li key={`${choice}-${choiceIndex}`}>{choice}</li>
                ))}
              </ol>
            </div>
          ))}
          {promptInfo?.fullText && (
            <details className="prompt-fulltext">
              <summary>SYSTEM_INSTRUCTIONS を確認</summary>
              <p>{promptInfo.fullText}</p>
              {promptInfo?.source && <p className="prompt-source">source: {promptInfo.source}</p>}
            </details>
          )}
        </div>
      )}
    </details>
  )
}

function App() {
  const [articles, setArticles] = useState([])
  const [typeOrder, setTypeOrder] = useState([])
  const [status, setStatus] = useState('loading')
  const [page, setPage] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const datasets = await Promise.all(
          TYPE_SOURCES.map(async ({ typeId, filename }) => {
            const response = await fetch(`${import.meta.env.BASE_URL}data/${filename}`)
            if (!response.ok) {
              throw new Error(`Failed to load type${typeId} dataset: ${response.status}`)
            }

            const text = await response.text()
            return { typeId, records: parseJsonl(text) }
          })
        )

        const articleMap = new Map()

        datasets.forEach(({ typeId, records }) => {
          records.forEach((record) => {
            const key = record.news_item_id ?? record.id
            if (!key) {
              return
            }

            const existing = articleMap.get(key)
            const questionTypes = existing?.questionTypes ?? {}

            const mergedArticle = {
              news_item_id: record.news_item_id ?? existing?.news_item_id ?? null,
              id: record.id ?? existing?.id ?? key,
              headline: record.headline ?? existing?.headline ?? '',
              sub_headline:
                record.sub_headline === undefined ? existing?.sub_headline ?? null : record.sub_headline,
              content: record.content ?? existing?.content ?? '',
              date_time: record.date_time ?? existing?.date_time ?? null,
              provider_id: record.provider_id ?? existing?.provider_id ?? null,
              first_created: record.first_created ?? existing?.first_created ?? null,
              questionTypes: {
                ...questionTypes,
                [`type${typeId}`]: record.questions ?? []
              }
            }

            articleMap.set(key, mergedArticle)
          })
        })

        const mergedArticles = Array.from(articleMap.values()).sort((a, b) => {
          const dateA = a.date_time ?? ''
          const dateB = b.date_time ?? ''
          if (dateA === dateB) {
            return (a.headline ?? '').localeCompare(b.headline ?? '')
          }
          return dateB.localeCompare(dateA)
        })

        setArticles(mergedArticles)
        setTypeOrder(TYPE_SOURCES.map(({ typeId }) => typeId))
        setStatus('ready')
      } catch (error) {
        console.error(error)
        setStatus('error')
      }
    }

    fetchData()
  }, [])

  const totalPages = Math.max(Math.ceil(articles.length / PAGE_SIZE), 1)

  const pagedArticles = useMemo(() => {
    const start = page * PAGE_SIZE
    return articles.slice(start, start + PAGE_SIZE)
  }, [articles, page])

  const visibleTypes = typeOrder.length ? typeOrder : TYPE_SOURCES.map(({ typeId }) => typeId)

  const changePage = (nextPage) => {
    setPage(Math.min(Math.max(nextPage, 0), totalPages - 1))
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">MCQ3 Question Comparator</p>
          <h1>ニュース記事と3タイプの理解度テストを横並びで比較</h1>
          <p className="hero-text">
            JSONLから抽出した各記事の共通情報と、type1・type7・type9で生成された理解度テストを
            ドロワー形式で同時に開きながら比較できます（1ページ {PAGE_SIZE} 件表示）。
          </p>
        </div>
        <div className="type-legend">
          {visibleTypes.map((typeId) => (
            <span key={typeId} className="type-pill">
              Type {typeId}
            </span>
          ))}
        </div>
      </header>

      {status === 'loading' && <p className="muted">データを読み込み中です…</p>}
      {status === 'error' && (
        <p className="error">データの読み込みに失敗しました。`public/data` 内の JSONL が存在するか確認してください。</p>
      )}

      {status === 'ready' && (
        <>
          <div className="pagination">
            <button onClick={() => changePage(page - 1)} disabled={page === 0}>
              前へ
            </button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <button onClick={() => changePage(page + 1)} disabled={page + 1 >= totalPages}>
              次へ
            </button>
          </div>

          <div className="article-stack">
            {pagedArticles.map((article, idx) => (
              <article key={article.news_item_id ?? idx} className="article-card">
                <div className="article-headline">
                  <p className="article-index">
                    #{page * PAGE_SIZE + idx + 1}{' '}
                    <span className="article-id">{article.news_item_id ?? article.id}</span>
                  </p>
                  <h2>{article.headline ?? '無題の記事'}</h2>
                  {article.sub_headline && <p className="muted">{article.sub_headline}</p>}
                  <div className="article-meta">
                    {article.provider_id && <span>{article.provider_id}</span>}
                    {article.date_time && <span>{article.date_time}</span>}
                  </div>
                </div>

                <ArticleContent content={article.content} />

                <div className="drawer-grid">
                  {visibleTypes.map((typeId) => {
                    const typeKey = `type${typeId}`
                    return (
                      <QuestionDrawer
                        key={`${article.news_item_id}-${typeKey}`}
                        typeId={typeId}
                        questions={article.questionTypes?.[typeKey]}
                        promptInfo={TYPE_PROMPT_INFO?.[typeId]}
                      />
                    )
                  })}
                </div>
              </article>
            ))}
          </div>

          <div className="pagination pagination-bottom">
            <button onClick={() => changePage(page - 1)} disabled={page === 0}>
              前へ
            </button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <button onClick={() => changePage(page + 1)} disabled={page + 1 >= totalPages}>
              次へ
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default App
