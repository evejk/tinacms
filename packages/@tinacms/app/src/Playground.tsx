import { createGraphiQLFetcher } from '@graphiql/toolkit'
import { GraphiQL } from 'graphiql'
import { parse, print } from 'graphql'
import React from 'react'
import { useCMS } from 'tinacms'
import { FolderIcon } from '@heroicons/react/outline'
import { queries } from 'CLIENT_IMPORT'

import 'graphiql/graphiql.min.css'

const fetcher = createGraphiQLFetcher({
  url: __API_URL__,
})

const Playground = () => {
  const cms = useCMS()
  const [query, setQuery] = React.useState('')
  const [variables, setVariables] = React.useState('')
  const [autoQueries, setAutoQueries] = React.useState()
  const [collectionInfo, setCollectionInfo] = React.useState<{
    collections: {
      name: string
      documents: { edges: { node: { _sys: { relativePath: string } } }[] }
    }[]
  }>()
  React.useEffect(() => {
    const run = async () => {
      if (queries) {
        const q = queries({ request: async () => query })
        setCollectionInfo(
          await cms.api.tina.request(
            `
      query {
        collections {
          name
          documents(first: 1) {
            edges {
              node {
                ...on Document {
                  _sys {
                    relativePath
                  }
                }
              }
            }
          }
        }
      }
      `,
            { variables: {} }
          )
        )
        setAutoQueries(q)
      } else {
        setAutoQueries({})
      }
    }
    run()
  }, [])

  const ref = React.useRef()

  if (!autoQueries) {
    return null
  }

  const Plugin = () => {
    const noAutoQueries = Object.keys(autoQueries).length === 0
    return (
      <div>
        <div className="graphiql-doc-explorer-title">Queries</div>
        <div className="graphiql-doc-explorer-content">
          <div className="graphiql-markdown-description">
            {noAutoQueries
              ? 'No autoqueries found, the Tina dev or build command was likely run with the "--noSDK" option. Learn about how to generate autoqeries.'
              : "Tina's autogenerated queries can be found here as well as any queries you may have defined yourself."}{' '}
            <a href="https://tina.io/docs/data-fetching/custom-queries/">
              Learn more here
            </a>
          </div>
          <nav className="space-y-1" aria-label="Sidebar">
            {Object.entries(autoQueries).map(([key, value]) => {
              const collection = collectionInfo?.collections.find(
                ({ name }) => name === key
              )
              let variables = ''
              let relativePath = ''
              if (collection) {
                relativePath =
                  collection.documents.edges[0].node._sys.relativePath
                variables = JSON.stringify({ relativePath }, null, 2)
              }
              return (
                <button
                  key={key}
                  className={classNames(
                    false
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'flex items-center rounded-md px-3 py-2 text-sm font-medium w-full text-left'
                  )}
                  onClick={async () => {
                    if (typeof value === 'function') {
                      const v = await value({})
                      const ast = parse(v.query)
                      setVariables(variables)
                      setQuery(print(ast))
                    }
                  }}
                >
                  <span className="truncate">
                    {key}{' '}
                    {relativePath && (
                      <span className="pl-2 text-sm text-gray-300">
                        ({relativePath})
                      </span>
                    )}{' '}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh' }}>
      <GraphiQL
        fetcher={fetcher}
        query={query}
        defaultEditorToolsVisibility="variables"
        isHeadersEditorEnabled={false}
        defaultTabs={[]}
        plugins={[
          {
            title: 'Queries',
            icon: () => <FolderIcon />,
            content: (values) => <Plugin />,
          },
        ]}
        variables={variables}
      ></GraphiQL>
    </div>
  )
}

export default Playground

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}
