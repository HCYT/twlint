export interface TextPosition {
  line: number
  column: number
  offset: number
}

export interface PositionMapping {
  originalPosition: TextPosition
  convertedPosition: TextPosition
}

export class PositionMapper {
  private mappings: PositionMapping[] = []
  private originalText: string
  private convertedText: string

  constructor(originalText: string, convertedText: string) {
    this.originalText = originalText
    this.convertedText = convertedText
    this.buildMappings()
  }

  private buildMappings(): void {
    // Build character-level mapping between original and converted text
    // This handles cases where character conversion changes text length

    const originalLines = this.originalText.split('\n')
    const convertedLines = this.convertedText.split('\n')

    let originalOffset = 0
    let convertedOffset = 0

    for (let lineIndex = 0; lineIndex < Math.max(originalLines.length, convertedLines.length); lineIndex++) {
      const originalLine = originalLines[lineIndex] || ''
      const convertedLine = convertedLines[lineIndex] || ''

      // Map each character position in the line
      const maxLength = Math.max(originalLine.length, convertedLine.length)

      for (let charIndex = 0; charIndex < maxLength; charIndex++) {
        if (charIndex < originalLine.length && charIndex < convertedLine.length) {
          this.mappings.push({
            originalPosition: {
              line: lineIndex + 1,
              column: charIndex + 1,
              offset: originalOffset + charIndex
            },
            convertedPosition: {
              line: lineIndex + 1,
              column: charIndex + 1,
              offset: convertedOffset + charIndex
            }
          })
        }
      }

      // Account for line breaks
      originalOffset += originalLine.length + 1 // +1 for \n
      convertedOffset += convertedLine.length + 1
    }
  }

  /**
   * Map position from converted text back to original text
   */
  mapToOriginal(convertedLine: number, convertedColumn: number): TextPosition {
    // Find the best matching position in original text
    const convertedOffset = this.getOffsetFromPosition(this.convertedText, convertedLine, convertedColumn)

    // Find closest mapping
    let bestMapping = this.mappings[0]
    let minDistance = Math.abs(bestMapping.convertedPosition.offset - convertedOffset)

    for (const mapping of this.mappings) {
      const distance = Math.abs(mapping.convertedPosition.offset - convertedOffset)
      if (distance < minDistance) {
        minDistance = distance
        bestMapping = mapping
      }
    }

    return bestMapping.originalPosition
  }

  /**
   * Map position from original text to converted text
   */
  mapToConverted(originalLine: number, originalColumn: number): TextPosition {
    const originalOffset = this.getOffsetFromPosition(this.originalText, originalLine, originalColumn)

    // Find closest mapping
    let bestMapping = this.mappings[0]
    let minDistance = Math.abs(bestMapping.originalPosition.offset - originalOffset)

    for (const mapping of this.mappings) {
      const distance = Math.abs(mapping.originalPosition.offset - originalOffset)
      if (distance < minDistance) {
        minDistance = distance
        bestMapping = mapping
      }
    }

    return bestMapping.convertedPosition
  }

  private getOffsetFromPosition(text: string, line: number, column: number): number {
    const lines = text.split('\n')
    let offset = 0

    // Add lengths of previous lines
    for (let i = 0; i < line - 1 && i < lines.length; i++) {
      offset += lines[i].length + 1 // +1 for \n
    }

    // Add column position in current line
    offset += Math.min(column - 1, lines[line - 1]?.length || 0)

    return offset
  }

  /**
   * Simple mapping for cases where text lengths are similar
   * Falls back to this when detailed mapping is not needed
   */
  static simpleMap(originalLine: number, originalColumn: number): TextPosition {
    return {
      line: originalLine,
      column: originalColumn,
      offset: 0 // Not computed in simple mapping
    }
  }
}