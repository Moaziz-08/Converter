// Hauptskript für die Anwendung

document.addEventListener("DOMContentLoaded", () => {
  // Globale Variablen
  let fontSize = 18
  let lineHeight = 1.8
  let letterSpacing = 0.5
  let textColor = "#333333"
  let paperStyle = "grid"
  let paperColor = "#f8f8f8"
  let gridColor = "#dddddd"
  let gridSize = 20
  let paperMargin = 40
  let randomRotation = true
  let randomSize = true
  let handwritingVariation = true
  let exportingPdf = false
  let exportingImage = false

  // Hilfsfunktion, um Erfolgsmeldungen anzuzeigen
  function showSuccessMessage(message) {
    const messageDiv = document.createElement("div")
    messageDiv.textContent = message
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 128, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
        `
    document.body.appendChild(messageDiv)

    // Nachricht nach 3 Sekunden ausblenden
    setTimeout(() => {
      document.body.removeChild(messageDiv)
    }, 3000)
  }

  // Hilfsfunktion, um Papierstile zu generieren
  function getPaperStyle(paperStyle, gridSize, gridColor) {
    if (paperStyle === "grid") {
      return {
        backgroundImage: `repeating-linear-gradient(0deg, ${gridColor}, ${gridColor} 1px, transparent 1px, transparent ${gridSize}px),
                                  repeating-linear-gradient(90deg, ${gridColor}, ${gridColor} 1px, transparent 1px, transparent ${gridSize}px)`,
      }
    } else if (paperStyle === "lines") {
      return {
        backgroundImage: `repeating-linear-gradient(180deg, ${gridColor}, ${gridColor} 1px, transparent 1px, transparent ${gridSize}px)`,
      }
    } else {
      return {
        backgroundImage: "none",
      }
    }
  }

  // Hilfsfunktion zum Exportieren als PDF (benötigt jsPDF)
  async function exportToPDF(element, backgroundColor) {
    try {
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      })

      // Den Hintergrund explizit als Rechteck hinzufügen
      pdf.setFillColor(backgroundColor)
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), "F")

      await pdf.html(element, {
        margin: [20, 20, 20, 20],
      })

      pdf.save("handwriting.pdf")
      return true
    } catch (error) {
      console.error("Fehler beim PDF-Export: ", error)
      return false
    }
  }

  // Hilfsfunktion zum Exportieren als einfaches PDF
  function exportSimplePDF(text, textColor) {
    try {
      const { jsPDF } = window.jspdf
      const pdf = new jsPDF()

      pdf.setTextColor(textColor)
      pdf.text(text, 10, 10)
      pdf.save("simple_handwriting.pdf")
      return true
    } catch (error) {
      console.error("Fehler beim einfachen PDF-Export: ", error)
      return false
    }
  }

  // Hilfsfunktion zum Exportieren als Bild (benötigt html2canvas)
  async function exportToImage(element, backgroundColor) {
    try {
      const html2canvas = window.html2canvas
      const canvas = await html2canvas(element, {
        backgroundColor: backgroundColor,
      })

      const dataURL = canvas.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = dataURL
      link.download = "handwriting.png"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return true
    } catch (error) {
      console.error("Fehler beim Bild-Export: ", error)
      return false
    }
  }

  // Initialisiere LocalStorage-Wrapper
  const storage = {
    get: (key, defaultValue) => {
      try {
        const value = localStorage.getItem(key)
        return value ? JSON.parse(value) : defaultValue
      } catch (e) {
        console.warn(`Fehler beim Abrufen von ${key} aus dem LocalStorage`, e)
        return defaultValue
      }
    },
    set: (key, value) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (e) {
        console.warn(`Fehler beim Speichern von ${key} im LocalStorage`, e)
      }
    },
  }

  // Lade benutzerdefinierte Schriftarten aus dem LocalStorage
  const customFonts = storage.get("custom-handwriting-fonts", {})

  // Füge benutzerdefinierte Schriftarten zur Auswahl hinzu
  const fontSelect = document.getElementById("font-select")
  Object.keys(customFonts).forEach((fontName) => {
    const option = document.createElement("option")
    option.value = `custom-${fontName}`
    option.textContent = `Meine Handschrift: ${fontName}`
    fontSelect.appendChild(option)
  })

  // Tab-Wechsel
  document.getElementById("tab-convert").addEventListener("click", () => {
    document.getElementById("tab-convert").classList.add("active")
    document.getElementById("tab-create").classList.remove("active")
    document.getElementById("tab-content-convert").classList.add("active")
    document.getElementById("tab-content-create").classList.remove("active")
  })

  document.getElementById("tab-create").addEventListener("click", () => {
    document.getElementById("tab-convert").classList.remove("active")
    document.getElementById("tab-create").classList.add("active")
    document.getElementById("tab-content-convert").classList.remove("active")
    document.getElementById("tab-content-create").classList.add("active")
  })

  // Inner-Tab-Wechsel
  document.getElementById("tab-draw").addEventListener("click", () => {
    document.getElementById("tab-draw").classList.add("active")
    document.getElementById("tab-settings").classList.remove("active")
    document.getElementById("tab-content-draw").classList.add("active")
    document.getElementById("tab-content-settings").classList.remove("active")
  })

  document.getElementById("tab-settings").addEventListener("click", () => {
    document.getElementById("tab-draw").classList.remove("active")
    document.getElementById("tab-settings").classList.add("active")
    document.getElementById("tab-content-draw").classList.remove("active")
    document.getElementById("tab-content-settings").classList.add("active")
  })

  // Einstellungen-Modal
  const modal = document.getElementById("settings-modal")

  document.getElementById("settings-button").addEventListener("click", () => {
    modal.style.display = "block"
  })

  document.getElementById("close-modal").addEventListener("click", () => {
    modal.style.display = "none"
  })

  window.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none"
    }
  })

  // Accordion-Funktionalität
  document.getElementById("paper-settings-button").addEventListener("click", () => {
    const panel = document.getElementById("paper-settings-panel")
    panel.style.display = panel.style.display === "block" ? "none" : "block"
  })

  document.getElementById("variation-settings-button").addEventListener("click", () => {
    const panel = document.getElementById("variation-settings-panel")
    panel.style.display = panel.style.display === "block" ? "none" : "block"
  })

  // Text-Eingabe
  document.getElementById("input-text").addEventListener("input", updateOutput)

  // Schriftart-Auswahl
  document.getElementById("font-select").addEventListener("change", updateOutput)

  // Einstellungen-Änderungen
  document.getElementById("font-size").addEventListener("input", (e) => {
    fontSize = Number.parseInt(e.target.value)
    document.getElementById("font-size-value").textContent = fontSize
    updateOutput()
  })

  document.getElementById("line-height").addEventListener("input", (e) => {
    lineHeight = Number.parseFloat(e.target.value)
    document.getElementById("line-height-value").textContent = lineHeight.toFixed(1)
    updateOutput()
  })

  document.getElementById("text-spacing").addEventListener("input", (e) => {
    letterSpacing = Number.parseFloat(e.target.value)
    document.getElementById("text-spacing-value").textContent = letterSpacing.toFixed(1)
    updateOutput()
  })

  document.getElementById("text-color").addEventListener("input", (e) => {
    textColor = e.target.value
    document.getElementById("text-color-value").textContent = textColor
    updateOutput()
  })

  document.getElementById("paper-style").addEventListener("change", (e) => {
    paperStyle = e.target.value
    updateOutput()
  })

  document.getElementById("paper-color").addEventListener("input", (e) => {
    paperColor = e.target.value
    document.getElementById("paper-color-value").textContent = paperColor
    updateOutput()
  })

  document.getElementById("grid-color").addEventListener("input", (e) => {
    gridColor = e.target.value
    document.getElementById("grid-color-value").textContent = gridColor
    updateOutput()
  })

  document.getElementById("grid-size").addEventListener("input", (e) => {
    gridSize = Number.parseInt(e.target.value)
    document.getElementById("grid-size-value").textContent = gridSize
    updateOutput()
  })

  document.getElementById("paper-margin").addEventListener("input", (e) => {
    paperMargin = Number.parseInt(e.target.value)
    document.getElementById("paper-margin-value").textContent = paperMargin
    updateOutput()
  })

  document.getElementById("handwriting-variation").addEventListener("change", (e) => {
    handwritingVariation = e.target.checked
    document.getElementById("random-rotation").disabled = !handwritingVariation
    document.getElementById("random-size").disabled = !handwritingVariation
    updateOutput()
  })

  document.getElementById("random-rotation").addEventListener("change", (e) => {
    randomRotation = e.target.checked
    updateOutput()
  })

  document.getElementById("random-size").addEventListener("change", (e) => {
    randomSize = e.target.checked
    updateOutput()
  })

  // Buttons
  document.getElementById("copy-button").addEventListener("click", () => {
    const text = document.getElementById("input-text").value
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showSuccessMessage("Text wurde in die Zwischenablage kopiert!")
      })
      .catch((err) => {
        console.error("Fehler beim Kopieren: ", err)
      })
  })

  document.getElementById("pdf-button").addEventListener("click", async () => {
    if (exportingPdf) return

    exportingPdf = true
    document.getElementById("pdf-button").textContent = "Wird exportiert..."

    const preview = document.getElementById("preview")
    const result = await exportToPDF(preview, paperColor)

    if (result) {
      showSuccessMessage("PDF wurde erfolgreich gespeichert!")
    } else {
      showSuccessMessage("Fehler beim PDF-Export. Bitte versuchen Sie es erneut.")
    }

    exportingPdf = false
    document.getElementById("pdf-button").innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Als PDF speichern
        `
  })

  document.getElementById("simple-pdf-button").addEventListener("click", () => {
    const text = document.getElementById("input-text").value
    const result = exportSimplePDF(text, textColor)

    if (result) {
      showSuccessMessage("Einfaches PDF wurde erfolgreich gespeichert!")
    } else {
      showSuccessMessage("Fehler beim PDF-Export. Bitte versuchen Sie es erneut.")
    }
  })

  document.getElementById("image-button").addEventListener("click", async () => {
    if (exportingImage) return

    exportingImage = true
    document.getElementById("image-button").textContent = "Wird exportiert..."

    const preview = document.getElementById("preview")
    const result = await exportToImage(preview, paperColor)

    if (result) {
      showSuccessMessage("Bild wurde erfolgreich gespeichert!")
    } else {
      showSuccessMessage("Fehler beim Bild-Export. Bitte versuchen Sie es erneut.")
    }

    exportingImage = false
    document.getElementById("image-button").innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Als Bild speichern
        `
  })

  // Ausgabe aktualisieren
  function updateOutput() {
    const text = document.getElementById("input-text").value
    const font = document.getElementById("font-select").value
    const textOutput = document.getElementById("text-output")
    const previewContent = document.getElementById("preview-content")

    // Papierstil aktualisieren
    const paperStyleResult = getPaperStyle(paperStyle, gridSize, gridColor)
    Object.assign(previewContent.style, paperStyleResult)
    previewContent.style.backgroundColor = paperColor
    previewContent.style.padding = `${paperMargin}px`

    // Text-Stil aktualisieren
    textOutput.style.fontSize = `${fontSize}px`
    textOutput.style.lineHeight = lineHeight
    textOutput.style.letterSpacing = `${letterSpacing}px`
    textOutput.style.color = textColor

    // Schriftart anwenden
    if (font.startsWith("custom-")) {
      // Benutzerdefinierte Handschrift rendern
      renderCustomText(text, font)
    } else {
      // Standard-Schriftart anwenden
      textOutput.className = "text-output"
      textOutput.classList.add(`font-${font.toLowerCase().replace(/\s+/g, "-")}`)
      textOutput.textContent = text
    }
  }

  // Benutzerdefinierte Handschrift rendern
  function renderCustomText(text, fontName) {
    const textOutput = document.getElementById("text-output")
    textOutput.innerHTML = ""

    const customFontName = fontName.replace("custom-", "")
    const fontData = customFonts[customFontName]

    if (!fontData) {
      textOutput.textContent = text
      return
    }

    const characterImages = fontData.characters
    const metadata = fontData.metadata || {
      letterSpacing: 0.5,
      baselineVariation: 2,
      sizeVariation: 0.1,
      rotationVariation: 3,
      charMap: {},
      scale: 1.5,
    }

    const lines = text.split("\n")

    lines.forEach((line, lineIndex) => {
      if (line === "") {
        const lineBreak = document.createElement("div")
        lineBreak.style.width = "100%"
        textOutput.appendChild(lineBreak)
        return
      }

      const lineDiv = document.createElement("div")
      lineDiv.style.display = "flex"
      lineDiv.style.flexWrap = "wrap"
      lineDiv.style.alignItems = "baseline"

      line.split("").forEach((char, index) => {
        if (char === " ") {
          const space = document.createElement("span")
          space.style.width = `${fontSize * 0.6}px`
          lineDiv.appendChild(space)
          return
        }

        // Finde den Index des Zeichens im Zeichensatz
        let imageIndex = -1

        // Wenn wir eine Zeichenzuordnung haben, verwenden wir diese
        if (metadata.charMap && metadata.charMap[char] !== undefined) {
          imageIndex = metadata.charMap[char]
        } else {
          // Fallback für ältere Handschriften ohne charMap
          const charCode = char.charCodeAt(0)
          if (charCode >= 97 && charCode <= 122) {
            // a-z
            imageIndex = charCode - 97
          } else if (charCode >= 65 && charCode <= 90) {
            // A-Z
            imageIndex = charCode - 65 + 26 // Nach den Kleinbuchstaben
          }
        }

        if (imageIndex >= 0 && imageIndex < characterImages.length && characterImages[imageIndex]) {
          // Natürliche Variationen hinzufügen
          const baselineShift = handwritingVariation
            ? Math.random() * metadata.baselineVariation - metadata.baselineVariation / 2
            : 0

          const sizeVariation =
            randomSize && handwritingVariation
              ? 1 + (Math.random() * metadata.sizeVariation - metadata.sizeVariation / 2)
              : 1

          const rotation =
            randomRotation && handwritingVariation
              ? Math.random() * metadata.rotationVariation - metadata.rotationVariation / 2
              : 0

          // Anwendung des Skalierungsfaktors für realistischere Größe
          const scaleFactor = metadata.scale || 1.5
          const actualSize = fontSize * sizeVariation * scaleFactor

          // Realistischerer Buchstabenabstand basierend auf der Zeichenbreite
          const charSpacing = letterSpacing * (metadata.letterSpacing || 1)

          const charDiv = document.createElement("div")
          charDiv.style.display = "inline-block"
          charDiv.style.transform = `translateY(${baselineShift}px) rotate(${rotation}deg)`
          charDiv.style.marginRight = `${charSpacing}px`

          const img = document.createElement("img")
          img.src = characterImages[imageIndex]
          img.alt = char
          img.style.height = `${actualSize}px`
          img.style.display = "inline-block"
          img.style.verticalAlign = "baseline"

          charDiv.appendChild(img)
          lineDiv.appendChild(charDiv)
        } else {
          const charSpan = document.createElement("span")
          charSpan.textContent = char
          lineDiv.appendChild(charSpan)
        }
      })

      textOutput.appendChild(lineDiv)
    })
  }

  // Initialisiere die Ausgabe
  updateOutput()
})

