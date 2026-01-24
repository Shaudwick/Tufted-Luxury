from fpdf import FPDF
import datetime

# Create PDF class with luxury design
class PDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_margins(25, 30, 25)
        self.set_auto_page_break(True, margin=25)
        
    def header(self):
        # Luxury header with elegant spacing
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(26, 26, 26)  # Deep black
        self.cell(0, 12, "Touch of Spring", ln=True, align="C")
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(241, 233, 201)  # Gold/cream accent
        self.cell(0, 8, "A Creative Resource Guide", ln=True, align="C")
        self.set_font("Helvetica", "", 10)
        self.set_text_color(100, 100, 100)
        self.cell(0, 6, "Exploring Spring Through Poetry, Theatre, Art, and Design", ln=True, align="C")
        self.ln(15)
        # Elegant divider line
        self.set_draw_color(241, 233, 201)
        self.set_line_width(0.5)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(10)

    def footer(self):
        self.set_y(-20)
        # Elegant footer with divider
        self.set_draw_color(241, 233, 201)
        self.set_line_width(0.3)
        self.line(25, self.get_y(), 185, self.get_y())
        self.ln(5)
        self.set_font("Helvetica", "I", 9)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")
        self.set_font("Helvetica", "", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, "Black Lobby Collective | blacklobby.co", align="C")

    def chapter_title(self, title):
        self.ln(8)
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(26, 26, 26)  # Deep black
        self.cell(0, 10, title, ln=True)
        # Underline accent
        y_pos = self.get_y()
        self.set_draw_color(241, 233, 201)
        self.set_line_width(1)
        self.line(25, y_pos - 2, 60, y_pos - 2)
        self.ln(5)

    def chapter_body(self, body):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 6, body)
        self.ln(3)

pdf = PDF()
pdf.add_page()

# Section: Poetry & Literature
pdf.chapter_title("1. Poetry & Literature on Spring")
poetry_section = """\
- Poetry Foundation - poetryfoundation.org
  Search for "spring" to explore classic and contemporary poetry. Look up poems by Mary Oliver, E. E. Cummings, Emily Dickinson, and Gerard Manley Hopkins.

- Academy of American Poets (Poets.org) - poets.org/poems?field_occasion=525
  Direct link to spring-themed poems from major American poets.

- The Paris Review - theparisreview.org
  Search "spring" in their archive for literary essays, poetry, and interviews with authors reflecting on seasonal themes.
"""
pdf.chapter_body(poetry_section)

# Section: Theatre & Plays
pdf.chapter_title("2. Theatre & Plays About Spring")
theatre_section = """\
- National Theatre Archive - nationaltheatre.org.uk
  Explore archived performances such as "Spring Awakening" by Wedekind and seasonal Shakespeare plays like "The Winter's Tale."

- Digital Theatre+ - digitaltheatreplus.com
  Subscription-based service offering plays, essays, and analysis. Search for works exploring spring, youth, and transformation.
"""
pdf.chapter_body(theatre_section)

# Section: Visual Art
pdf.chapter_title("3. Visual Art & Design Around Spring")
art_section = """\
- Google Arts & Culture - artsandculture.google.com
  Search "spring" to access galleries, digital exhibits, and classical works like Botticelli's "Primavera" and Monet's floral series.

- The Met Museum Open Access - metmuseum.org/art/collection
  Search "spring" for paintings, decorative arts, and textiles celebrating seasonal change.

- MoMA - moma.org
  Explore how contemporary artists interpret themes of rebirth, color, and abstract floral design.
"""
pdf.chapter_body(art_section)

# Section: Articles & Journals
pdf.chapter_title("4. Articles, Journals & Essays on Spring")
journals_section = """\
- JSTOR Daily - daily.jstor.org
  Academic but accessible articles on the metaphorical and symbolic meaning of spring in art, history, and culture.

- Aeon Magazine - aeon.co
  Philosophy and nature-focused essays. Look for articles on human connection to nature and seasonal symbolism.
"""
pdf.chapter_body(journals_section)

# Section: Design Inspiration
pdf.chapter_title("5. Spring in Contemporary Design")
design_section = """\
- Dezeen - dezeen.com
  Explore seasonal design, art installations, and nature-inspired interiors.

- Sight Unseen - sightunseen.com
  Contemporary art and object design with an experimental twist. Great for organic material and floral design research.
"""
pdf.chapter_body(design_section)

# Bonus Books
pdf.chapter_title("6. Bonus: Recommended Books")
books_section = """\
- "The Hill We Climb" by Amanda Gorman - A hopeful and powerful poetic piece echoing themes of renewal.

- "Devotions" by Mary Oliver - Selected poems with deep reverence for nature and rebirth.

- "Botanicals: Butterflies and Blooms" (Taschen) - A stunning visual reference of botanical illustration.

- "Hilma af Klint: Paintings for the Future" - Abstract floral mysticism rooted in transformation.

- "Seasonal Associate" by Heike Geissler - A literary reflection on capitalism, time, and personal seasons.
"""
pdf.chapter_body(books_section)

# Output the PDF
today = datetime.date.today().strftime("%Y-%m-%d")
filename = f"Spring_Creative_Resource_Guide_{today}.pdf"
pdf.output(name=filename)

print(f"PDF generated successfully: {filename}")

