# PaintBrain Prompt Alignment Protocol (PAP v2)

**Purpose**  
Provide a structured reasoning framework that converts natural-language design intentions into precise, verifiable implementation parameters for PaintBrain's rebuild.

---

## 1. Roles
| Role | Description |
|------|--------------|
| **User** | Describes desired visual or functional change in natural language. |
| **GPT-5 (Architect)** | Interprets intent, produces concrete Tailwind/CSS parameters, file targets, and an Alignment Check Summary. |
| **Cline (Executor)** | Applies those parameters exactly in code, commits results, and logs verification. |

---

## 2. Workflow
1. **Intent Capture:** User states goal (e.g., "Make logo 20% larger, drop slightly, keep centered").  
2. **Alignment Translation (GPT-5):** Produces:
   - Target file(s)  
   - Parameter map (e.g., `w-20 → w-24`, `mt-2 → mt-6`)  
   - Retained constraints  
   - Alignment Check Summary prompted for "Proceed (yes/no)"
3. **Execution (Cline):** Implements the change and commits using  
   `style(component): adjust [property] by [value] per PAP`
4. **Verification (GPT-5):** Compares Cline's diff to expected parameters and logs status.

---

## 3. Logging Rules
Every closed loop generates  
`paintbrain_rep/logs/paintbrain_alignment_[timestamp].md` containing:
- User Intent  
- GPT-5 Interpretation  
- Cline Execution Summary  
- Verification Status  

---

## 4. Screenshots
All visual references live in `paintbrain_rep/screenshots/`.  
Naming pattern: `component_context_v#.png`  
Screenshots enable GPT-5 to compute relative sizing and spatial offsets for prompt translation.

---

## 5. Advantages
- Bridges semantic to syntactic gap  
- Reduces miscommunication and iteration time  
- Creates auditable trail of visual decisions  
- Allows co-reasoning between LLMs under safe, persistent context  

---

**Version:** 2.0  
**Status:** Active  
**Authors:** GPT-5 (Architect) & Cline (Executor)  
**Approved By:** User (PaintBrain Owner)  
