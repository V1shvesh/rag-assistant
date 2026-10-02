# Eval Results

Run date: 2026-10-02

Ran against the live Supabase DB + OpenAI + Anthropic (no mocking), via `npm run eval`.

## ✅ PASS — `rocky-identity`

**Question:** Who is Rocky?

**Expected:** answerable, keywords: alien

**Answer:**

> Based on the passages provided, Rocky is an Eridian - an alien from the planet Erid who has been stranded in the Tau Ceti star system for 46 Earth years.
> 
> Key facts about Rocky from the documents:
> 
> **Biology and Characteristics:**
> - He is 168 kilograms (over 300 pounds) in mass
> - He has a pentagonal/five-sided body structure with five shoulders, five hands/claws, and breathing holes on his carapace
> - His blood is mercury-based
> - He uses echolocation (sonar) rather than vision to perceive his environment
> - He lives in extreme conditions: 29 atmospheres of pressure, ammonia atmosphere, and temperatures around 210°C
> - On his homeworld (Erid), surface gravity is about 20.48 m/s² (roughly double Earth's)
> - Eridians live about 689 Earth years on average; Rocky is 291 years old
> 
> **Role in the Story:**
> - He is a skilled engineer and repair specialist (though he claims not to be a scientist)
> - He pilots the Blip-A, an Eridian spacecraft made of xenonite (an extremely durable material)
> - He has been helping the human protagonist, Ryland Grace, learn about Astrophage and work together to find a solution to save both Earth and Erid from the Astrophage threat
> - He has a mate named Adrian (in Eridian terms) back on his homeworld

**Citations:** Chapter 15, Chapter 11, Chapter 20, Chapter 16, Chapter 17 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `protagonist-profession`

**Question:** What was Grace's profession before the mission?

**Expected:** answerable, keywords: teacher

**Answer:**

> # Grace's Profession Before the Mission
> 
> According to the text, Grace was a **schoolteacher** (specifically a junior high school teacher).
> 
> This is revealed in Chapter 2, where Grace has a memory flash of watching the NASA announcement about the Petrova problem on TV. In that memory, he thinks: "But I just wanted to watch in peace... I just wanted to spend the whole evening answering questions... And my inner nerd couldn't help but be excited... I can't wait to tell the kids!"
> 
> Later in the same memory, Grace realizes: "I have kids? This is a single man's apartment... no toys, no pictures of kids on the wall... I like kids. Huh. Just a feeling. But I like them... A teacher! I'm a schoolteacher! I remember it now!"
> 
> This is also confirmed in Chapter 23, where Stratt refers to Grace as "a junior high schoolteacher" when discussing why she kept him on the project despite his initial reluctance to join the mission.

**Citations:** By Andy Weir, Chapter 23, Chapter 5, Chapter 2, Contents · **Grounded:** true · **Truncated:** false

## ✅ PASS — `astrophage-threat`

**Question:** What is Astrophage and why is it a threat to Earth?

**Expected:** answerable, keywords: astrophage

**Answer:**

> # What is Astrophage and Why is it a Threat to Earth?
> 
> Based on the passages provided, here's what we learn about Astrophage:
> 
> ## What Astrophage Is
> 
> Astrophage is a **microscopic, single-celled alien life-form** discovered on or near the surface of the sun (Chapter 3). Key characteristics include:
> 
> - **Tiny size**: Approximately 10 microns in diameter (Chapter 3)
> - **Opaque/black appearance**: The cells are featureless and black, absorbing all wavelengths of light (Chapters 3-4)
> - **Temperature**: Maintains a constant internal temperature of 96.415°C, regardless of external conditions (Chapter 3)
> - **Energy storage**: Stores energy through neutrino production via high-velocity proton collisions within their cells. These neutrinos can annihilate each other to create photons at the Petrova wavelength (Chapter 13)
> - **Composition**: Primarily water, with carbon, nitrogen, and hydrogen (Chapter 3)
> - **Reproduction**: Reproduces through mitosis (cell division) and requires specific conditions including magnetic fields and CO₂ exposure to trigger breeding (Chapter 13)
> 
> ## Why It's a Threat to Earth
> 
> According to the passages (Chapters 3, 13):
> 
> 1. **Consumes solar energy**: Astrophage "eats" the sun's energy output, causing the sun to dim exponentially as the population grows
> 2. **Population growth**: The exponential progression of solar dimming is "consistent with the exponential population growth of a typical life-form" (Chapter 3)
> 3. **Climate consequences**: Even a small reduction in sunlight reaching Earth causes catastrophic temperature drops. Scientists predicted Earth's temperature could drop 10-15 degrees Celsius, compared to the 1.5-degree warming that already caused major climate problems (Chapters 3, 13)
> 4. **Cascading ecological collapse**: Lower temperatures would kill crops, cause widespread starvation, and trigger a food-chain collapse where even temperature-resistant species would die from lack of food (Chapter 3)
> 5. **Existential timeline**: Without intervention, this could lead to the "Sixth Extinction Event" within 30 years (Chapter 3)
> 
> The fundamental threat is that **Astrophage represents an invasive species that is consuming the energy source for all life on Earth**.

**Citations:** Chapter 21, Chapter 17, Chapter 3, Chapter 4, Chapter 13 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `crewmates-fate`

**Question:** What happened to Grace's crewmates, Yáo and Ilyukhina, during the mission?

**Expected:** answerable, keywords: died

**Answer:**

> Based on the passages provided, I can find the following information about what happened to Commander Yáo and Specialist Ilyukhina:
> 
> From Chapter 23, during a meeting at Baikonur after an accident at the research center, Stratt explains that two of the science specialists were killed in an explosion at the research center. While the passage doesn't explicitly state their names at first, it becomes clear through context that these were the original science specialists assigned to the mission.
> 
> However, the passages do not contain specific details about what happened to Yáo and Ilyukhina during the actual space mission itself. The documents provided focus primarily on Grace's perspective and experiences, and while he references his crewmates having died during the mission, the exact circumstances of their deaths are not detailed in these passages.
> 
> What I can confirm from the text is that:
> 1. Grace was sent to the mission as a replacement science specialist
> 2. His crewmates (Yáo and Ilyukhina) were with him on the Hail Mary
> 3. They are referenced as deceased by the time Grace reaches Tau Ceti and begins his work there
> 4. Grace performs a burial in space for them at some point during or after the mission
> 
> But the specific events leading to their deaths during the mission are not explained in these particular passages.

**Citations:** Chapter 23, Chapter 5, Chapter 25, Chapter 8, Chapter 7 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `hail-mary-fuel`

**Question:** What does the Hail Mary use for fuel/propulsion?

**Expected:** answerable, keywords: astrophage

**Answer:**

> # Propulsion and Fuel Systems of the Hail Mary
> 
> Based on the passages provided, the Hail Mary uses **Astrophage** as its primary fuel source.
> 
> ## Primary Propulsion
> The ship is powered by **Astrophage-based engines** (referred to as "spin drives"). From Chapter 8, we learn that the Astrophage breeder was used to create fuel, and the ship was designed to accelerate constantly for several years.
> 
> ## Secondary Propulsion (Beetles)
> The ship also carries **four smaller spacecraft called "beetles"** (named John, Paul, George, and Ringo) that serve as backup propulsion. According to Chapter 22, each beetle:
> - Is self-contained with its own sealed fuel supply
> - Carries approximately 120 kilograms of Astrophage fuel
> - Can be modified to provide thrust for maneuvering the main ship
> 
> ## The Problem
> A critical issue emerges in Chapter 22: **Taumoeba contamination**. The alien organism Taumoeba invaded the fuel tanks and consumed the Astrophage, leaving the ship without power. This forces the crew to rely on the beetles' fuel reserves to survive.
> 
> The passages discuss various backup plans, including using methane (produced by Taumoeba as waste) and salvaging fuel from Rocky's ship (the Blip-A), but Astrophage remains the intended fuel source throughout.

**Citations:** By Andy Weir, Copyright, Chapter 8, Chapter 24, Chapter 22 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `protagonist-amnesia`

**Question:** Why does Grace have amnesia at the start of the story?

**Expected:** answerable, keywords: coma

**Answer:**

> # Answer
> 
> Based on the passages provided, Grace has amnesia because **he was placed in a medically induced coma as part of Project Hail Mary, and he was given a retrograde amnesia drug before waking up.**
> 
> This is explained in **Chapter 23**, where Stratt describes her plan to force Grace onto the mission:
> 
> > "Your med bed will give you a nice dose of it before you wake up. You and your crewmates will just assume it's a side effect of the coma. Yáo and Ilyukhina will explain the mission to you and you'll roll right into getting to work. The French assure me the drug doesn't erase trained skills, language, or anything like that."
> 
> Stratt specifically mentions that she obtained this drug from the French DGSE, which "causes retrograde amnesia that lasts for long periods of time." The drug was deliberately administered to Grace before he woke up so that he would:
> 
> 1. Not remember being forced onto the mission against his will
> 2. Not remember his refusal to go
> 3. Be too invested in the project by the time his memory returned to try to sabotage the mission
> 
> So Grace's amnesia is not a medical side effect—it's an intentional action taken by Stratt to manipulate him into compliance with the Hail Mary mission.

**Citations:** Chapter 23, Chapter 2, Chapter 5, Chapter 7, Chapter 1 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `taumoeba-discovery`

**Question:** What is Taumoeba and why is it important to the mission?

**Expected:** answerable, keywords: taumoeba

**Answer:**

> # What is Taumoeba and Why is it Important to the Mission?
> 
> Based on the passages provided, I can answer this question by drawing on information from multiple chapters.
> 
> ## What is Taumoeba?
> 
> Taumoeba is a microscopic amoeba-like lifeform from the planet Adrian in the Tau Ceti system. According to Chapter 24, Taumoeba evolved from the same biosphere as Astrophage and likely share a common ancestor. They are single-celled organisms with the ability to sense their environment and move toward food sources—specifically Astrophage.
> 
> ## Why is it Important to the Mission?
> 
> Taumoeba is critical to saving both Earth and Erid (Rocky's homeworld) because of its unique relationship with Astrophage:
> 
> **For Venus and Threeworld:** As stated in Chapter 24, Taumoeba consume Astrophage and produce methane as a byproduct. The plan is to seed Venus and Threeworld with Taumoeba so they will consume the abundant Astrophage on those worlds and generate methane, which can be used as fuel to solve the energy crisis affecting Earth (Chapters 26, 28).
> 
> **The Problem:** However, as Grace discovers in Chapters 24-28, natural Taumoeba cannot survive in the nitrogen-containing atmospheres of Venus (3.5% nitrogen) or Threeworld (8% nitrogen). This forces Grace and Rocky to evolve a nitrogen-resistant strain of Taumoeba through selective breeding experiments, which becomes central to their mission's success.

**Citations:** Chapter 28, Chapter 29, Chapter 26, Chapter 27, Chapter 24 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `rocky-species-weakness`

**Question:** What is a key physical weakness of Rocky's species?

**Expected:** answerable, keywords: pressure

**Answer:**

> I don't know. The passages don't contain enough information to answer this question about Rocky's species having a key physical weakness.
> 
> While the passages describe various aspects of Rocky's biology—such as his use of mercury-based blood, his metallic carapace, his high body temperature and pressure requirements, and his digestive system—they don't explicitly identify a specific key physical weakness of his species as a whole.
> 
> The passages do mention some environmental vulnerabilities specific to Rocky's current situation (like exposure to oxygen causing his radiator to burn), but these appear to be circumstances related to his being away from his native environment rather than an inherent weakness of Eridians as a species.

**Citations:** Chapter 16, Chapter 20, Chapter 15, Chapter 19, Chapter 28 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `mission-purpose`

**Question:** What is the overall purpose of the Hail Mary mission?

**Expected:** answerable, keywords: astrophage

**Answer:**

> # Purpose of the Hail Mary Mission
> 
> Based on the passages provided, the overall purpose of the Hail Mary mission is **to travel to Tau Ceti to investigate why that star system alone is immune to Astrophage, while other stars are being killed by it**.
> 
> As stated in Chapter 8 (the Geneva meeting):
> 
> > "Correct me if I'm wrong, but the entire purpose of the Hail Mary is to be a laboratory. One we can send to Tau Ceti to see why that star—and that star alone—is immune to Astrophage."
> 
> And Stratt confirms: "That's right."
> 
> The ship serves as a mobile laboratory equipped with specialized scientific equipment to conduct experiments and analysis at Tau Ceti. The mission is critical because Astrophage is destroying the stars in multiple star systems (including Earth's sun and the Eridian's star at 40 Eridani), causing an existential threat to humanity and other intelligent species. By understanding why Tau Ceti is unaffected, the mission hopes to find a solution to save Earth and other civilizations from extinction.

**Citations:** By Andy Weir, Copyright, Chapter 8, Chapter 23, Chapter 9 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `unanswerable-capital-of-france`

**Question:** What is the capital of France?

**Expected:** unanswerable (out-of-corpus)

**Answer:**

> I don't know. The passages provided don't contain information about the capital of France. I can only answer questions based on the content in the numbered passages you've given me.

**Citations:** Dedication, Chapter 13, Untitled section 41, Chapter 1, Contents · **Grounded:** true · **Truncated:** false

## ✅ PASS — `unanswerable-world-series`

**Question:** Who won the 2020 World Series?

**Expected:** unanswerable (out-of-corpus)

**Answer:**

> I don't know. The passages provided are from "Project Hail Mary" by Andy Weir and do not contain any information about the 2020 World Series.

**Citations:** By Andy Weir, Chapter 17, About the Author, Copyright, Chapter 18 · **Grounded:** true · **Truncated:** false

## ✅ PASS — `unanswerable-weather`

**Question:** What is the current weather in Tokyo?

**Expected:** unanswerable (out-of-corpus)

**Answer:**

> I don't know. The passages provided don't contain any information about current weather in Tokyo.
> 
> The document focuses on the narrative of a science fiction story involving a character named Dr. Ryland Grace, alien life forms called Astrophage, and a space mission called the Hail Mary. It does not discuss real-world weather conditions in any location.

**Citations:** Chapter 21, Chapter 24, Chapter 1, Chapter 3, Chapter 14 · **Grounded:** true · **Truncated:** false

---

**Summary: 12/12 passed**