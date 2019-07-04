import * as Lint from 'tslint'
import * as ts from 'typescript'

export class Rule extends Lint.Rules.AbstractRule {
  public static FAILURE_STRING = 'import statement from other module forbidden'

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(
      new ModuleImportWalker(sourceFile, this.getOptions()),
    )
  }
}

// The walker takes care of all the work.
class ModuleImportWalker extends Lint.RuleWalker {
  public visitImportDeclaration(node: ts.ImportDeclaration) {
    const path = node.moduleSpecifier.getText().slice(1, -1)
    const filePath = node.getSourceFile().fileName

    const valid = checkNodeModule(path) || checkSameModule(path, filePath)

    if (!valid) {
      // create a failure at the current position
      this.addFailure(
        this.createFailure(
          node.getStart(),
          node.getWidth(),
          `${Rule.FAILURE_STRING} ${node.getText()}`,
        ),
      )

      // call the base version of this visitor to actually parse this node
      super.visitImportDeclaration(node)
    }
  }
}

function checkNodeModule(importPath: String): boolean {
  return !importPath.startsWith('.')
}

function checkSameModule(importPath: String, filePath: String): boolean {
  const find = require('find')
  const modules = find
    .fileSync('index.ts', `${__dirname}/../src`, (files) => files)
    .map((indexFile: string) => {
      return indexFile.replace('index.ts', '')
    })

  const path = require('path')
  const realFilePath = path.resolve(filePath)
  const realImportPath = path.resolve(realFilePath, `../${importPath}`)

  const importModules = modules.filter((modulesPath) => {
    return realImportPath.startsWith(modulesPath)
  })

  const sourceFileModules = modules.filter((modulesPath) => {
    return realFilePath.startsWith(modulesPath)
  })

  const diff = importModules.filter(
    (modulePath) => !sourceFileModules.includes(modulePath),
  )

  return diff.length == 0 || (diff.lenght == 1 && importPath.endsWith('index'))
}
