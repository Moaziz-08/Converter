// Handwriting Creator Modul

// Konstanten für die Zeichengruppen
const LOWERCASE_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("")
const UPPERCASE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")
const NUMBERS = "0123456789".split("")
const SPECIAL_CHARS = ",.;:!?\"'()[]{}<>+-*/=_&%$#@~^|\\".split("")
const ALL_CHARS = [...LOWERCASE_LETTERS, ...UPPERCASE_LETTERS, ...NUMBERS, ...SPECIAL_CHARS]

// Gruppierung der Zeichen für die Benutzeroberfläche
const CHAR_GROUPS = [
  { id: "lowercase", name: "Kleinbuchstaben", chars: LOWERCASE_LETTERS },
  { id: "uppercase", name: "Großbuchstaben", chars: UPPERCASE_LETTERS },
  { id: "numbers", name: "Zahlen", chars: NUMBERS },
  { id: "special", name: "Sonderzeichen", chars: SPECIAL_CHARS },
]

// Hilfsfunktionen (müssen vor der Verwendung deklariert werden)
function drawGuideLines(ctx, guideLineStyle, canvasWidth, canvasHeight) {
  ctx.strokeStyle = "#CCCCCC"
  ctx.lineWidth = 1

  if (guideLineStyle === "fourLines") {
    // Vier Linien: Ober-, Mittellinie, Grundlinie, Unterlinie
    const lineHeight = canvasHeight / 4
    ctx.beginPath()
    ctx.moveTo(0, lineHeight)
    ctx.lineTo(canvasWidth, lineHeight)
    ctx.moveTo(0, lineHeight * 2)
    ctx.lineTo(canvasWidth, lineHeight * 2)
    ctx.moveTo(0, lineHeight * 3)
    ctx.lineTo(canvasWidth, lineHeight * 3)
    ctx.stroke()
  } else if (guideLineStyle === "oneLine") {
    // Nur eine Grundlinie
    const baseline = canvasHeight * 0.75
    ctx.beginPath()
    ctx.moveTo(0, baseline)
    ctx.lineTo(canvasWidth, baseline)
    ctx.stroke()
  }
}

function saveCanvasWithTransparentBackground(canvas, guideLineStyle) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null

  // Erstelle ein neues Canvas-Element
  const tempCanvas = document.createElement("canvas")
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height
  const tempCtx = tempCanvas.getContext("2d")

  // Zeichne den Inhalt des Original-Canvas auf das temporäre Canvas
  tempCtx.drawImage(canvas, 0, 0)

  // Extrahiere die Bilddaten
  const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  // Ersetze fast-weiße Pixel durch transparente Pixel
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Definiere einen Schwellenwert, um fast-weiße Pixel zu erkennen
    const threshold = 240

    if (r > threshold && g > threshold && b > threshold) {
      data[i + 3] = 0 // Setze den Alpha-Wert auf 0 (transparent)
    }
  }

  // Schreibe die modifizierten Bilddaten zurück auf das temporäre Canvas
  tempCtx.putImageData(imageData, 0, 0)

  // Gib die Daten-URL des temporären Canvas zurück
  return tempCanvas.toDataURL("image/png")
}

function showSuccessMessage(message) {
  const messageBox = document.getElementById("message-box")
  const messageText = document.getElementById("message-text")

  messageText.textContent = message
  messageBox.classList.add("show")

  setTimeout(() => {
    messageBox.classList.remove("show")
  }, 3000) // Nachricht wird nach 3 Sekunden ausgeblendet
}

const storage = {
  get: (key, defaultValue) => {
    try {
      const value = localStorage.getItem(key)
      return value ? JSON.parse(value) : defaultValue
    } catch (error) {
      console.error("Error getting data from localStorage:", error)
      return defaultValue
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error("Error setting data to localStorage:", error)
    }
  },
}

class HandwritingCreator {
  constructor() {
    // DOM-Elemente
    this.canvas = document.getElementById("drawing-canvas")
    this.canvasContainer = document.getElementById("canvas-container")
    this.currentCharElement = document.getElementById("current-char")
    this.characterGrid = document.getElementById("character-grid")
    this.previewTextOutput = document.getElementById("preview-text-output")
    this.progressValue = document.getElementById("progress-value")

    // Einstellungen
    this.fontName = ""
    this.currentGroup = "lowercase"
    this.currentCharIndex = 0
    this.characterImages = {}
    this.penSize = 3
    this.penColor = "#000000"
    this.letterSpacing = 0.5
    this.baselineVariation = 2
    this.sizeVariation = 0.1
    this.rotationVariation = 3
    this.scale = 1.5
    this.showGuideLines = true
    this.guideLineStyle = "fourLines"
    this.canvasWidth = 300
    this.canvasHeight = 200
    this.previewText = "The quick brown fox jumps over the lazy dog. 123!?"

    // Zeichnen-Status
    this.isDrawing = false
    this.lastPosition = { x: 0, y: 0 }
    this.undoStack = []
    this.currentImageData = null

    // Initialisierung
    this.initCanvas()
    this.initCharacterGrid()
    this.initEventListeners()
    this.updateCharacterInfo()
    this.updatePreview()
  }

  // Canvas initialisieren
  initCanvas() {
    // Canvas-Größe an Container anpassen
    this.resizeCanvas()

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Canvas mit transparentem Hintergrund initialisieren
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Zeichne Hilfslinien
    if (this.showGuideLines) {
      drawGuideLines(ctx, this.guideLineStyle, this.canvas.width, this.canvas.height)
    }

    // Speichere den initialen Zustand für Undo
    const initialState = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    this.undoStack = [initialState]
    this.currentImageData = initialState
  }

  // Canvas-Größe an Container anpassen
  resizeCanvas() {
    const containerWidth = this.canvasContainer.clientWidth
    this.canvasWidth = containerWidth - 4 // 4px für den Border
    this.canvasHeight = Math.min(containerWidth * 0.6, 300)

    this.canvas.width = this.canvasWidth
    this.canvas.height = this.canvasHeight
  }

  // Character Grid initialisieren
  initCharacterGrid() {
    this.characterGrid.innerHTML = ""

    CHAR_GROUPS.forEach((group) => {
      // Gruppentitel
      const groupTitle = document.createElement("div")
      groupTitle.className = "character-group-title"
      groupTitle.textContent = group.name
      this.characterGrid.appendChild(groupTitle)

      // Zeichen
      group.chars.forEach((char) => {
        const charItem = document.createElement("div")
        charItem.className = "character-item"
        if (this.currentGroup === group.id && this.currentCharIndex === group.chars.indexOf(char)) {
          charItem.classList.add("active")
        }

        const charLabel = document.createElement("div")
        charLabel.className = "character-label"
        charLabel.textContent = char
        charItem.appendChild(charLabel)

        if (this.characterImages[char]) {
          const img = document.createElement("img")
          img.src = this.characterImages[char]
          img.alt = `Zeichen ${char}`
          img.className = "character-image"
          charItem.appendChild(img)
        } else {
          const emptyDiv = document.createElement("div")
          emptyDiv.className = "character-empty"
          const emptyText = document.createElement("span")
          emptyText.className = "character-empty-text"
          emptyText.textContent = "Leer"
          emptyDiv.appendChild(emptyText)
          charItem.appendChild(emptyDiv)
        }

        // Event-Listener zum Wechseln des Zeichens
        charItem.addEventListener("click", () => {
          this.setCurrentGroup(group.id)
          this.setCurrentCharIndex(group.chars.indexOf(char))
        })

        this.characterGrid.appendChild(charItem)
      })
    })
  }

  // Event-Listener initialisieren
  initEventListeners() {
    // Canvas-Events für das Zeichnen
    this.canvas.addEventListener("mousedown", this.startDrawing.bind(this))
    this.canvas.addEventListener("mousemove", this.draw.bind(this))
    this.canvas.addEventListener("mouseup", this.stopDrawing.bind(this))
    this.canvas.addEventListener("mouseleave", this.stopDrawing.bind(this))

    // Touch-Events für mobile Geräte
    this.canvas.addEventListener("touchstart", this.startDrawing.bind(this))
    this.canvas.addEventListener("touchmove", this.draw.bind(this))
    this.canvas.addEventListener("touchend", this.stopDrawing.bind(this))

    // Fenster-Resize-Event
    window.addEventListener("resize", () => {
      this.resizeCanvas()
      this.initCanvas()
      this.loadCurrentCharacter()
    })

    // Buttons und Einstellungen
    document.getElementById("prev-char").addEventListener("click", this.prevCharacter.bind(this))
    document.getElementById("next-char").addEventListener("click", this.nextCharacter.bind(this))
    document.getElementById("clear-button").addEventListener("click", this.clearCanvas.bind(this))
    document.getElementById("undo-button").addEventListener("click", this.undoLastAction.bind(this))
    document.getElementById("save-font-button").addEventListener("click", this.saveFont.bind(this))
    document.getElementById("export-button").addEventListener("click", this.exportHandwriting.bind(this))
    document.getElementById("import-file").addEventListener("change", this.importHandwriting.bind(this))

    // Einstellungen-Änderungen
    document.getElementById("pen-size").addEventListener("input", (e) => {
      this.penSize = Number.parseFloat(e.target.value)
      document.getElementById("pen-size-value").textContent = this.penSize
    })

    document.getElementById("pen-color").addEventListener("input", (e) => {
      this.penColor = e.target.value
    })

    document.getElementById("show-guidelines").addEventListener("change", (e) => {
      this.showGuideLines = e.target.checked
      this.initCanvas()
      this.loadCurrentCharacter()

      // Zeige/verstecke Linientyp-Auswahl
      document.getElementById("guideline-type-container").style.display = this.showGuideLines ? "block" : "none"
    })

    document.getElementById("guideline-type").addEventListener("change", (e) => {
      this.guideLineStyle = e.target.value
      this.initCanvas()
      this.loadCurrentCharacter()
    })

    document.getElementById("letter-spacing").addEventListener("input", (e) => {
      this.letterSpacing = Number.parseFloat(e.target.value)
      document.getElementById("letter-spacing-value").textContent = this.letterSpacing.toFixed(1)
      this.updatePreview()
    })

    document.getElementById("baseline-variation").addEventListener("input", (e) => {
      this.baselineVariation = Number.parseFloat(e.target.value)
      document.getElementById("baseline-variation-value").textContent = this.baselineVariation
      this.updatePreview()
    })

    document.getElementById("size-variation").addEventListener("input", (e) => {
      this.sizeVariation = Number.parseFloat(e.target.value)
      document.getElementById("size-variation-value").textContent = this.sizeVariation.toFixed(2)
      this.updatePreview()
    })

    document.getElementById("rotation-variation").addEventListener("input", (e) => {
      this.rotationVariation = Number.parseFloat(e.target.value)
      document.getElementById("rotation-variation-value").textContent = this.rotationVariation
      this.updatePreview()
    })

    document.getElementById("scale-factor").addEventListener("input", (e) => {
      this.scale = Number.parseFloat(e.target.value)
      document.getElementById("scale-factor-value").textContent = this.scale.toFixed(1)
      this.updatePreview()
    })

    document.getElementById("preview-text").addEventListener("input", (e) => {
      this.previewText = e.target.value
      this.updatePreview()
    })

    // Badge-Gruppe für Zeichengruppen
    document.querySelectorAll(".badge").forEach((badge) => {
      badge.addEventListener("click", () => {
        const groupId = badge.getAttribute("data-group")
        if (groupId) {
          this.setCurrentGroup(groupId)
          this.setCurrentCharIndex(0)
        }
      })
    })

    // Font-Name-Input
    document.getElementById("font-name").addEventListener("input", (e) => {
      this.fontName = e.target.value
    })
  }

  // Aktuelles Zeichen laden
  loadCurrentCharacter() {
    const currentChars = CHAR_GROUPS.find((group) => group.id === this.currentGroup)?.chars || LOWERCASE_LETTERS
    const currentChar = currentChars[this.currentCharIndex]

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Canvas zurücksetzen
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Zeichne Hilfslinien
    if (this.showGuideLines) {
      drawGuideLines(ctx, this.guideLineStyle, this.canvas.width, this.canvas.height)
    }

    // Lade vorhandenes Bild, falls vorhanden
    if (this.characterImages[currentChar]) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

        // Zeichne Hilfslinien
        if (this.showGuideLines) {
          drawGuideLines(ctx, this.guideLineStyle, this.canvas.width, this.canvas.height)
        }

        ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height)
        // Speichere den geladenen Zustand
        this.currentImageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
        this.undoStack = [this.currentImageData]
      }
      img.src = this.characterImages[currentChar]
    } else {
      // Speichere den initialen Zustand für Undo
      this.currentImageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
      this.undoStack = [this.currentImageData]
    }
  }

  // Zeichnen starten
  startDrawing(e) {
    e.preventDefault()
    this.isDrawing = true

    const rect = this.canvas.getBoundingClientRect()
    let clientX, clientY

    if (e.type === "touchstart") {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    this.lastPosition = { x, y }
  }

  // Zeichnen
  draw(e) {
    e.preventDefault()
    if (!this.isDrawing) return

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    const rect = this.canvas.getBoundingClientRect()
    let clientX, clientY

    if (e.type === "touchmove") {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(this.lastPosition.x, this.lastPosition.y)
    ctx.lineTo(x, y)
    ctx.strokeStyle = this.penColor
    ctx.lineWidth = this.penSize
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.stroke()

    this.lastPosition = { x, y }
  }

  // Zeichnen beenden
  stopDrawing() {
    if (!this.isDrawing) return
    this.isDrawing = false

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Speichere den aktuellen Zustand für Undo
    const newImageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    this.undoStack.push(newImageData)
    this.currentImageData = newImageData

    // Aktiviere/Deaktiviere Undo-Button
    document.getElementById("undo-button").disabled = this.undoStack.length <= 1

    // Speichere das aktuelle Bild mit transparentem Hintergrund
    this.saveCurrentCharacter()
  }

  // Aktuelles Zeichen speichern
  saveCurrentCharacter() {
    const currentChars = CHAR_GROUPS.find((group) => group.id === this.currentGroup)?.chars || LOWERCASE_LETTERS
    const currentChar = currentChars[this.currentCharIndex]

    // Speichere das Bild mit transparentem Hintergrund
    const imageUrl = saveCanvasWithTransparentBackground(this.canvas, this.guideLineStyle)
    if (imageUrl) {
      this.characterImages[currentChar] = imageUrl
      this.updateProgress()
      this.initCharacterGrid()
      this.updatePreview()
    }
  }

  // Canvas löschen
  clearCanvas() {
    const ctx = this.canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Lösche den Canvas
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Zeichne Hilfslinien neu
    if (this.showGuideLines) {
      drawGuideLines(ctx, this.guideLineStyle, this.canvas.width, this.canvas.height)
    }

    // Speichere den neuen Zustand
    const newImageData = ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    this.undoStack = [newImageData]
    this.currentImageData = newImageData

    // Deaktiviere Undo-Button
    document.getElementById("undo-button").disabled = true

    // Lösche auch das gespeicherte Bild
    const currentChars = CHAR_GROUPS.find((group) => group.id === this.currentGroup)?.chars || LOWERCASE_LETTERS
    const currentChar = currentChars[this.currentCharIndex]
    delete this.characterImages[currentChar]

    this.updateProgress()
    this.initCharacterGrid()
    this.updatePreview()
  }

  // Letzte Aktion rückgängig machen
  undoLastAction() {
    if (this.undoStack.length <= 1) return

    const ctx = this.canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Entferne den letzten Zustand
    this.undoStack.pop()
    const lastImageData = this.undoStack[this.undoStack.length - 1]

    // Stelle den vorherigen Zustand wieder her
    ctx.putImageData(lastImageData, 0, 0)

    this.currentImageData = lastImageData

    // Deaktiviere Undo-Button, wenn keine weiteren Zustände vorhanden sind
    document.getElementById("undo-button").disabled = this.undoStack.length <= 1

    // Aktualisiere das gespeicherte Bild
    this.saveCurrentCharacter()
  }

  // Zum nächsten Zeichen wechseln
  nextCharacter() {
    const currentChars = CHAR_GROUPS.find((group) => group.id === this.currentGroup)?.chars || LOWERCASE_LETTERS

    if (this.currentCharIndex < currentChars.length - 1) {
      this.setCurrentCharIndex(this.currentCharIndex + 1)
    } else if (this.currentGroup !== "special") {
      // Wechsle zur nächsten Gruppe, wenn wir am Ende sind
      const currentGroupIndex = CHAR_GROUPS.findIndex((g) => g.id === this.currentGroup)
      if (currentGroupIndex < CHAR_GROUPS.length - 1) {
        this.setCurrentGroup(CHAR_GROUPS[currentGroupIndex + 1].id)
        this.setCurrentCharIndex(0)
      }
    }
  }

  // Zum vorherigen Zeichen wechseln
  prevCharacter() {
    if (this.currentCharIndex > 0) {
      this.setCurrentCharIndex(this.currentCharIndex - 1)
    } else if (this.currentGroup !== "lowercase") {
      // Wechsle zur vorherigen Gruppe, wenn wir am Anfang sind
      const currentGroupIndex = CHAR_GROUPS.findIndex((g) => g.id === this.currentGroup)
      if (currentGroupIndex > 0) {
        this.setCurrentGroup(CHAR_GROUPS[currentGroupIndex - 1].id)
        this.setCurrentCharIndex(CHAR_GROUPS[currentGroupIndex - 1].chars.length - 1)
      }
    }
  }

  // Aktuelle Gruppe setzen
  setCurrentGroup(groupId) {
    this.currentGroup = groupId

    // Aktualisiere die aktiven Badges
    document.querySelectorAll(".badge").forEach((badge) => {
      if (badge.getAttribute("data-group") === groupId) {
        badge.classList.add("active")
      } else {
        badge.classList.remove("active")
      }
    })

    this.updateCharacterInfo()
    this.initCharacterGrid()
    this.loadCurrentCharacter()
  }

  // Aktuellen Zeichenindex setzen
  setCurrentCharIndex(index) {
    this.currentCharIndex = index
    this.updateCharacterInfo()
    this.initCharacterGrid()
    this.loadCurrentCharacter()
  }

  // Zeicheninformationen aktualisieren
  updateCharacterInfo() {
    const currentChars = CHAR_GROUPS.find((group) => group.id === this.currentGroup)?.chars || LOWERCASE_LETTERS
    const currentChar = currentChars[this.currentCharIndex]
    const groupName = CHAR_GROUPS.find((group) => group.id === this.currentGroup)?.name || "Kleinbuchstaben"

    this.currentCharElement.textContent = currentChar
    document.querySelector(".character-subtitle").textContent =
      `${this.currentCharIndex + 1} von ${currentChars.length} in Gruppe "${groupName}"`
  }

  // Fortschritt aktualisieren
  updateProgress() {
    const totalChars = ALL_CHARS.length
    const drawnChars = Object.keys(this.characterImages).length
    const progress = Math.round((drawnChars / totalChars) * 100)

    this.progressValue.textContent = progress
  }

  // Vorschau aktualisieren
  updatePreview() {
    this.previewTextOutput.innerHTML = ""

    const lines = this.previewText.split("\n")

    lines.forEach((line, lineIndex) => {
      if (line === "") {
        const lineBreak = document.createElement("div")
        lineBreak.style.width = "100%"
        this.previewTextOutput.appendChild(lineBreak)
        return
      }

      const lineDiv = document.createElement("div")
      lineDiv.style.display = "flex"
      lineDiv.style.flexWrap = "wrap"
      lineDiv.style.alignItems = "baseline"

      line.split("").forEach((char, index) => {
        if (char === " ") {
          const space = document.createElement("span")
          space.style.width = `${18 * 0.6}px`
          lineDiv.appendChild(space)
          return
        }

        if (this.characterImages[char]) {
          // Natürliche Variationen hinzufügen
          const baselineShift = Math.random() * this.baselineVariation - this.baselineVariation / 2
          const sizeVariationLocal = 1 + (Math.random() * this.sizeVariation - this.sizeVariation / 2)
          const rotation = Math.random() * this.rotationVariation - this.rotationVariation / 2

          // Anwendung des Skalierungsfaktors für realistischere Größe
          const actualSize = 18 * sizeVariationLocal * this.scale

          const charDiv = document.createElement("div")
          charDiv.style.display = "inline-block"
          charDiv.style.transform = `translateY(${baselineShift}px) rotate(${rotation}deg)`
          charDiv.style.marginRight = `${this.letterSpacing * 0.5}px`

          const img = document.createElement("img")
          img.src = this.characterImages[char]
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

      this.previewTextOutput.appendChild(lineDiv)
    })
  }

  // Handschrift speichern
  saveFont() {
    if (!this.fontName.trim()) {
      showSuccessMessage("Bitte geben Sie einen Namen für Ihre Handschrift ein.")
      return
    }

    // Prüfe, ob mindestens die Kleinbuchstaben gezeichnet wurden
    const missingLowercase = LOWERCASE_LETTERS.filter((char) => !this.characterImages[char])
    if (missingLowercase.length > 0) {
      showSuccessMessage(`Bitte zeichnen Sie alle Kleinbuchstaben. Es fehlen: ${missingLowercase.join(", ")}`)
      return
    }

    // Konvertiere das Objekt in ein Array für die Speicherung
    const allCharsArray = ALL_CHARS.map((char) => this.characterImages[char] || "")

    // Speichere die Handschrift mit Metadaten
    const metadata = {
      letterSpacing: this.letterSpacing,
      baselineVariation: this.baselineVariation,
      sizeVariation: this.sizeVariation,
      rotationVariation: this.rotationVariation,
      scale: this.scale,
      charMap: ALL_CHARS.reduce((map, char, index) => {
        map[char] = index
        return map
      }, {}),
    }

    // Speichere in LocalStorage
    const customFonts = storage.get("custom-handwriting-fonts", {})
    customFonts[this.fontName] = {
      characters: allCharsArray,
      metadata: metadata,
    }
    storage.set("custom-handwriting-fonts", customFonts)

    // Aktualisiere die Schriftarten-Auswahl
    const fontSelect = document.getElementById("font-select")
    const option = document.createElement("option")
    option.value = `custom-${this.fontName}`
    option.textContent = `Meine Handschrift: ${this.fontName}`
    fontSelect.appendChild(option)

    showSuccessMessage(`Handschrift "${this.fontName}" wurde erfolgreich gespeichert!`)

    // Zurücksetzen
    document.getElementById("font-name").value = ""
    this.fontName = ""
    this.setCurrentGroup("lowercase")
    this.setCurrentCharIndex(0)
    this.characterImages = {}
    this.clearCanvas()
  }

  // Handschrift exportieren
  exportHandwriting() {
    // Erstelle ein Objekt mit allen Daten
    const handwritingData = {
      name: this.fontName,
      characters: this.characterImages,
      metadata: {
        letterSpacing: this.letterSpacing,
        baselineVariation: this.baselineVariation,
        sizeVariation: this.sizeVariation,
        rotationVariation: this.rotationVariation,
        scale: this.scale,
      },
    }

    // Konvertiere zu JSON und erstelle einen Download-Link
    const dataStr = JSON.stringify(handwritingData)
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr)

    const exportName = this.fontName || "meine-handschrift"

    const linkElement = document.createElement("a")
    linkElement.setAttribute("href", dataUri)
    linkElement.setAttribute("download", `${exportName}.json`)
    linkElement.click()

    showSuccessMessage("Handschrift wurde exportiert!")
  }

  // Handschrift importieren
  importHandwriting(e) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result)

        if (data.characters && typeof data.characters === "object") {
          document.getElementById("font-name").value = data.name || ""
          this.fontName = data.name || ""
          this.characterImages = data.characters

          // Lade Metadaten, falls vorhanden
          if (data.metadata) {
            this.letterSpacing = data.metadata.letterSpacing || 0.5
            document.getElementById("letter-spacing").value = this.letterSpacing
            document.getElementById("letter-spacing-value").textContent = this.letterSpacing.toFixed(1)

            this.baselineVariation = data.metadata.baselineVariation || 2
            document.getElementById("baseline-variation").value = this.baselineVariation
            document.getElementById("baseline-variation-value").textContent = this.baselineVariation

            this.sizeVariation = data.metadata.sizeVariation || 0.1
            document.getElementById("size-variation").value = this.sizeVariation
            document.getElementById("size-variation-value").textContent = this.sizeVariation.toFixed(2)

            this.rotationVariation = data.metadata.rotationVariation || 3
            document.getElementById("rotation-variation").value = this.rotationVariation
            document.getElementById("rotation-variation-value").textContent = this.rotationVariation

            this.scale = data.metadata.scale || 1.5
            document.getElementById("scale-factor").value = this.scale
            document.getElementById("scale-factor-value").textContent = this.scale.toFixed(1)
          }

          // Lade den ersten Buchstaben
          this.setCurrentGroup("lowercase")
          this.setCurrentCharIndex(0)
          this.updateProgress()
          this.initCharacterGrid()
          this.updatePreview()

          showSuccessMessage("Handschrift wurde importiert!")
        } else {
          showSuccessMessage("Die Datei enthält keine gültigen Handschriftdaten.")
        }
      } catch (error) {
        showSuccessMessage("Fehler beim Importieren der Handschrift.")
        console.error(error)
      }
    }
    reader.readAsText(file)
  }
}

// Initialisiere die Handwriting Creator Klasse, wenn das DOM geladen ist
document.addEventListener("DOMContentLoaded", () => {
  window.handwritingCreator = new HandwritingCreator()
})
