import { Question, AccessCode } from '../types';

const API_URL = "https://script.google.com/macros/s/AKfycbzBGs86EyDHjQ-TBQmUDcAHMRQoMF1T1qIgXKNBTZY3Uh01TY0IwlArT3ipSoQ2RgiE/exec";

export const googleSheetsService = {
  async validateAccessCode(code: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}?action=validateAccessCode&code=${code}`);
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error("Error validating access code:", error);
      return false;
    }
  },

  async getAccessCodes(): Promise<{ success: boolean; items: AccessCode[] }> {
    try {
      const response = await fetch(`${API_URL}?action=getAccessCodes`);
      const data = await response.json();
      console.log("Access codes:", data);
      
      let codesArray = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        codesArray = data.data || data.codes || data.items || [];
      }
      
      if (!Array.isArray(codesArray)) return { success: false, items: [] };
      
      const items = codesArray.map((item: any) => {
        if (Array.isArray(item)) {
          return {
            code: item[0] || "",
            createdAt: item[1] || "",
            active: item[2] === true || item[2] === "TRUE" || item[2] === undefined
          };
        }
        return {
          code: item.code || item.Code || item[0] || "",
          createdAt: item.createdAt || item.CreatedAt || item[1] || "",
          active: item.active !== false && item.Active !== false && item.active !== "FALSE" && item.Active !== "FALSE"
        };
      });
      return { success: true, items };
    } catch (error) {
      console.error("Error getting access codes:", error);
      return { success: false, items: [] };
    }
  },

  async getAllQuestions(): Promise<Question[]> {
    try {
      const response = await fetch(`${API_URL}?action=getAllQuestions`);
      const data = await response.json();
      
      let questionsArray = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        questionsArray = data.data || data.questions || [];
      }
      
      if (!Array.isArray(questionsArray)) return [];
      
      return questionsArray.map((row: any) => {
        if (Array.isArray(row)) {
          return {
            id: row[0] || "",
            label: row[1] || "",
            number: row[2] ? parseInt(row[2]) : 1,
            sourceType: row[3] || "word",
            statementRaw: row[4] || row[8] || "",
            solutionRaw: row[5] || "",
            createdAt: row[6] || "",
            active: row[7] === true || row[7] === "TRUE",
            raw: row[8] || ""
          };
        } else {
          return {
            id: row.id || "",
            label: row.label || "",
            number: row.number ? parseInt(row.number) : 1,
            sourceType: row.sourceType || "word",
            statementRaw: row.statementRaw || row.statement || row.raw || "",
            solutionRaw: row.solutionRaw || row.solution || "",
            createdAt: row.createdAt || "",
            active: row.active === true || row.active === "TRUE",
            raw: row.raw || ""
          };
        }
      });
    } catch (error) {
      console.error("Error getting all questions:", error);
      return [];
    }
  },

  async getQuestionsByNumber(number: number): Promise<Question[]> {
    try {
      const response = await fetch(`${API_URL}?action=getQuestionsByNumber&number=${number}`);
      const data = await response.json();
      console.log("Raw API response for getQuestionsByNumber:", data);
      
      let questionsArray = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.success === false) {
          console.warn("API returned success: false", data);
          return [];
        }
        questionsArray = data.items || data.data || data.questions || [];
      }
      
      if (!Array.isArray(questionsArray)) return [];
      
      return questionsArray.map((row: any) => {
        // Handle both array of arrays and array of objects
        if (Array.isArray(row)) {
          return {
            id: row[0] || "",
            label: row[1] || "",
            number: row[2] ? parseInt(row[2]) : 1,
            sourceType: row[3] || "word",
            statementRaw: row[4] || row[8] || "",
            solutionRaw: row[5] || "",
            createdAt: row[6] || "",
            active: row[7] === true || row[7] === "TRUE",
            raw: row[8] || ""
          };
        } else {
          return {
            id: row.id || "",
            label: row.label || "",
            number: row.number ? parseInt(row.number) : 1,
            sourceType: row.sourceType || "word",
            statementRaw: row.statementRaw || row.statement || row.raw || "",
            solutionRaw: row.solutionRaw || row.solution || "",
            createdAt: row.createdAt || "",
            active: row.active === true || row.active === "TRUE",
            raw: row.raw || ""
          };
        }
      });
    } catch (error) {
      console.error("Error getting questions by number:", error);
      throw error;
    }
  },

  async createAccessCode(code: string): Promise<boolean> {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'createAccessCode', code }),
      });
      return true;
    } catch (error) {
      console.error("Error creating access code:", error);
      return false;
    }
  },

  async deleteAccessCode(code: string): Promise<boolean> {
    return this.deleteAccessCodes([code]);
  },

  async deleteAccessCodes(codes: string[]): Promise<boolean> {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteAccessCodes', codes }),
      });
      return true;
    } catch (error) {
      console.error("Error deleting access codes:", error);
      return false;
    }
  },

  async saveStudentLogin(studentName: string, studentClass: string, accessCode: string): Promise<void> {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'saveStudentLogin', 
          studentName, 
          studentClass, 
          accessCode 
        }),
      });
    } catch (error) {
      console.error("Error saving student login:", error);
    }
  },

  async saveQuestions(questions: Question[]): Promise<boolean> {
    try {
      const payload = questions.map(q => ({
        id: q.id,
        label: q.label,
        number: q.number,
        sourceType: q.sourceType,
        statementRaw: q.statementRaw,
        solutionRaw: q.solutionRaw,
        raw: q.raw || ""
      }));

      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'saveQuestions', questions: payload }),
      });
      return true;
    } catch (error) {
      console.error("Error saving questions:", error);
      return false;
    }
  },

  async deleteQuestions(ids: string[]): Promise<boolean> {
    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'deleteQuestions', ids }),
      });
      return true;
    } catch (error) {
      console.error("Error deleting questions:", error);
      return false;
    }
  }
};
