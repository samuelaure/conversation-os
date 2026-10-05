import { Injectable } from '@nestjs/common';
import { Person, Niche } from '@prisma/client';

type PersonWithNiche = Person & { niche: Niche | null };

// ─── Template helpers ─────────────────────────────────────────────────────────

function firstName(p: PersonWithNiche) {
  return p.firstName;
}

function nicheSlug(p: PersonWithNiche): string | null {
  return p.niche?.slug ?? null;
}

function detectLanguage(p: PersonWithNiche): 'es' | 'en' {
  const code = p.countryCode?.toUpperCase();
  // Spanish-speaking countries
  const esCountries = ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'];
  if (code && esCountries.includes(code)) return 'es';
  // Fallback: check headline/location for Spanish words
  const text = `${p.headline ?? ''} ${p.location ?? ''}`.toLowerCase();
  if (text.match(/\b(abogad|despacho|firma|bufete|derecho|juridic|recruiter|reclutador|recursos humanos)\b/)) return 'es';
  return 'en';
}

// ─── Message Templates ────────────────────────────────────────────────────────

@Injectable()
export class MessageGeneratorService {

  /**
   * "Hola [Nombre], gracias por conectar" — sent right after connection accepted
   */
  generateInitialContact(p: PersonWithNiche): string {
    const lang = detectLanguage(p);
    if (lang === 'es') {
      return `Hola ${firstName(p)}, gracias por conectar 🙌`;
    }
    return `Hi ${firstName(p)}, thanks for the connect! 🙌`;
  }

  /**
   * First follow-up when no response to initial contact (~4-5 days later)
   */
  generateFollowUp1(p: PersonWithNiche): string {
    const lang = detectLanguage(p);
    const niche = nicheSlug(p);

    if (lang === 'es') {
      if (niche === 'abogados') {
        return `Hola ${firstName(p)}, quería retomar el contacto — me especializo en arquitectura de procesos y tecnología para despachos legales y me interesa mucho conocer cómo operáis vosotros. ¿Tienes unos minutos para una conversación rápida?`;
      }
      if (niche === 'recruiters') {
        return `Hola ${firstName(p)}, paso a saludarte de nuevo — trabajo en automatización y tecnología para equipos de recruiting y me gustaría entender cómo gestionáis vuestro proceso. ¿Cuándo tendrías un momento?`;
      }
      return `Hola ${firstName(p)}, paso a retomar el contacto — quería saber si podemos conectar un momento para conocernos mejor.`;
    }

    // English
    return `Hey ${firstName(p)}, just circling back — I work on process architecture and technology for ${niche === 'recruiters' ? 'talent teams' : 'professional service firms'} and would love to hear how things work on your end. Any chance for a quick chat?`;
  }

  /**
   * Second follow-up (~5 days after follow-up 1)
   */
  generateFollowUp2(p: PersonWithNiche): string {
    const lang = detectLanguage(p);
    if (lang === 'es') {
      return `${firstName(p)}, última vez que escribo 😄 — si en algún momento te apetece hablar sobre cómo la tecnología puede quitar carga a tu día a día, aquí me tienes.`;
    }
    return `${firstName(p)}, last ping I promise 😄 — if you ever want to chat about how tech can take work off your plate, I'm here.`;
  }

  /**
   * Research pitch — sent to RESPONDED contacts to invite them to a research conversation
   */
  generateResearchPitch(p: PersonWithNiche): string {
    const lang = detectLanguage(p);
    const niche = nicheSlug(p);

    if (lang === 'es') {
      if (niche === 'abogados') {
        return `${firstName(p)}, me alegra que hayas respondido 🙏 Te cuento rápidamente en qué estoy trabajando: estoy haciendo una investigación sobre cómo operan los despachos legales por dentro — captación de clientes, gestión de casos, documentación, tecnología. El objetivo es entender los procesos reales, no los que aparecen en los manuales.

¿Te animarías a una conversación de 20-30 minutos? Sería completamente abierta, sin agenda de ventas — solo quiero entender cómo funciona tu mundo. A cambio, cuando publique los hallazgos te los comparto primero.`;
      }
      if (niche === 'recruiters') {
        return `${firstName(p)}, me alegra que hayas respondido 🙏 Estoy haciendo una investigación sobre cómo operan los equipos de recruiting y talent acquisition por dentro — desde el sourcing hasta el cierre, herramientas, fricciones, métricas. Quiero entender los procesos reales, no la teoría.

¿Te animarías a una conversación de 20-30 minutos? Sin guion de ventas, solo aprendizaje. Te compartiré los hallazgos cuando estén publicados.`;
      }
      // Generic
      return `${firstName(p)}, me alegra tu respuesta 🙏 Estoy investigando cómo operan distintos sectores profesionales por dentro y me encantaría hablar contigo unos 20-30 minutos. ¿Te parece bien?`;
    }

    // English
    return `${firstName(p)}, glad you replied! 🙏 I'm doing research on how ${niche === 'recruiters' ? 'recruiting and talent teams' : 'professional service firms'} operate internally — real processes, real friction, real tools. Not theory.

Would you be up for a 20-30 min conversation? No sales pitch — just learning. I'll share the findings with you once published.`;
  }

  /**
   * Follow-up on the research pitch when no response (~3-4 days)
   */
  generateResearchPitchFollowUp(p: PersonWithNiche): string {
    const lang = detectLanguage(p);
    if (lang === 'es') {
      return `${firstName(p)}, entiendo que el tiempo escasea — si te parece bien, te puedo adaptar al formato que te sea más cómodo: una llamada corta, un intercambio de mensajes, o simplemente un par de preguntas por aquí mismo. Lo que mejor te vaya.`;
    }
    return `${firstName(p)}, totally understand if you're busy — happy to adapt to whatever format works: quick call, voice note, or even just a few questions over chat. Whatever's easiest for you.`;
  }

  /**
   * Confirms a research interview once accepted
   */
  generateResearchConfirm(p: PersonWithNiche): string {
    const lang = detectLanguage(p);
    if (lang === 'es') {
      return `Perfecto ${firstName(p)}, ¡genial! ¿Qué formato te va mejor — una llamada por aquí, por Zoom, o prefieres que lo hagamos directamente por chat? Y dime cuándo tienes hueco esta semana o la próxima, me adapto a ti.`;
    }
    return `Great ${firstName(p)}! What format works best for you — a call here, Zoom, or even just back-and-forth over chat? And let me know when you're free this week or next — happy to work around your schedule.`;
  }

  /**
   * Generates the interview question script for a given person,
   * based on which research questions are still open in their niche.
   */
  generateInterviewScript(
    p: PersonWithNiche,
    openQuestions: Array<{ order: number; question: string; context: string | null }>,
    maxQuestions = 5,
  ): string {
    const lang = detectLanguage(p);
    const selected = openQuestions.slice(0, maxQuestions);

    const intro = lang === 'es'
      ? `${firstName(p)}, aquí te dejo mis preguntas para que tengamos un hilo de referencia:`
      : `${firstName(p)}, here are my questions so we have a reference thread:`;

    const qs = selected.map((q, i) => `${i + 1}. ${q.question}`).join('\n');

    const outro = lang === 'es'
      ? `\n\nPor supuesto, si algo de esto te lleva a otras cosas interesantes, bienvenido sea — me interesa más entender tu realidad que seguir un guion.`
      : `\n\nFeel free to take the conversation wherever feels natural — I'm more interested in understanding your reality than sticking to a script.`;

    return `${intro}\n\n${qs}${outro}`;
  }

  /**
   * Notifies the person that an article was published from the research
   */
  generateArticleDelivery(p: PersonWithNiche, articleTitle: string, articleUrl: string): string {
    const lang = detectLanguage(p);
    if (lang === 'es') {
      return `${firstName(p)}, ¡publiqué el artículo que nació en parte de nuestra conversación! Se llama "${articleTitle}".

👉 ${articleUrl}

Gracias de verdad por tu tiempo — sin conversaciones como la nuestra esto no existiría. Si te apetece comentar algo o ves algo que mejorar, te escucho 🙏`;
    }
    return `${firstName(p)}, I published the article that grew partly from our conversation! It's called "${articleTitle}".

👉 ${articleUrl}

Genuinely grateful for your time — conversations like ours are what make this kind of work possible. If anything resonates or you'd push back on something, I'd love to hear it 🙏`;
  }

  /**
   * Dispatches to the right generator based on interaction type
   */
  generate(
    type: string,
    p: PersonWithNiche,
    extra?: {
      openQuestions?: Array<{ order: number; question: string; context: string | null }>;
      articleTitle?: string;
      articleUrl?: string;
    },
  ): string {
    switch (type) {
      case 'INITIAL_CONTACT':      return this.generateInitialContact(p);
      case 'FOLLOW_UP':            return this.generateFollowUp1(p);
      case 'FOLLOW_UP_2':          return this.generateFollowUp2(p);
      case 'RESEARCH_PITCH':       return this.generateResearchPitch(p);
      case 'RESEARCH_FOLLOW_UP':   return this.generateResearchPitchFollowUp(p);
      case 'RESEARCH_CONFIRM':     return this.generateResearchConfirm(p);
      case 'RESEARCH_INTERVIEW':   return this.generateInterviewScript(p, extra?.openQuestions ?? []);
      case 'ARTICLE_DELIVERY':     return this.generateArticleDelivery(p, extra?.articleTitle ?? '(título)', extra?.articleUrl ?? '(url)');
      default: return '';
    }
  }
}
