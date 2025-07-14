import { Envuments } from '..';

export class Parser {
  private TEMPLATE_REGEX = /\${\w*}/g;

  private escapeRegexChars(str: string) {
    return str.replace(/([.*+?^=!:${}()|[\]/\\])/g, '\\$1');
  }

  resolveValueString(key: string, value: string) {
    const templates = value.match(this.TEMPLATE_REGEX);
    if (!templates) return value;

    for (const template of templates) {
      const variable = template.slice(2, -1);
      if (!variable || variable === key) continue; // Prevent any circulars

      const variableVal = Envuments.get(variable);

      value = value.replace(new RegExp(this.escapeRegexChars(template), 'g'), variableVal || template);
    }

    return value;
  }
}
