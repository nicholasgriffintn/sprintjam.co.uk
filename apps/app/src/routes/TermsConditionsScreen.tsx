import { motion } from "framer-motion";
import { CalendarCheck } from "lucide-react";

import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";

const LAST_UPDATED = "22nd November 2025";

const TermsConditionsScreen = () => {
  usePageMeta(META_CONFIGS.terms);

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Terms and Conditions
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                By using SprintJam, you agree to these terms. We keep things
                simple and focused on providing a great estimation tool.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-200 mt-6">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Updated {LAST_UPDATED}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-8 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
            <div className="prose prose-slate dark:prose-invert max-w-none text-left">
              <h3>Usage of Service</h3>
              <p>
                SprintJam is provided "as is" for team estimation and
                collaboration. We reserve the right to modify or discontinue the
                service at any time.
              </p>
              <p>
                You are responsible for any content you create or share within
                the application. Please use the service responsibly and
                respectfully.
              </p>
              <p>
                You are also responsible for maintaining the confidentiality of
                your account credentials and ensuring that your account
                information remains accurate and up to date.
              </p>
              <p>
                You must be at least 18 years old to use SprintJam without
                parental consent. By using our services, you represent that you
                are above the minimum age required by the laws of your country.
              </p>
              <p>
                You will notify us immediately if you become aware of any
                security breaches or unauthorized access to your account.
              </p>

              <h3>Prohibited Use</h3>
              <p>
                You agree not to use SprintJam for any unlawful or prohibited
                purpose, including but not limited to:
              </p>
              <ul>
                <li>
                  Using the service for any illegal purpose or in violation of
                  any laws.
                </li>
                <li>
                  Transmitting any material that is harmful, threatening,
                  abusive, harassing, defamatory, obscene, or otherwise
                  objectionable
                </li>
                <li>
                  Attempting to interfere with, compromise the system integrity
                  or security, or circumvent any technical measures of the
                  Service
                </li>
                <li>
                  Engaging in any automated use of the system, such as using
                  scripts to collect information or interact with the Service
                </li>
                <li>
                  Uploading or transmitting viruses, malware, or other malicious
                  code
                </li>
              </ul>

              <h3>AI Technology Limitations</h3>
              <p>You acknowledge that:</p>
              <ul>
                <li>
                  Our Service uses artificial intelligence technology that may
                  not always provide accurate or complete information.
                </li>
                <li>
                  The AI may occasionally generate unexpected, inappropriate, or
                  inaccurate responses
                </li>
                <li>
                  You should not rely solely on our AI for critical decisions
                  related to health, finances, legal matters, or other
                  significant concerns
                </li>
                <li>
                  We do not guarantee specific outcomes or results from using
                  our AI Service
                </li>
              </ul>

              <h3>Disclaimer & Liability</h3>
              <p>
                To the maximum extent permitted by law, SprintJam and its
                contributors shall not be liable for any direct, indirect,
                incidental, special, consequential, or exemplary damages
                resulting from your use of the service.
              </p>
              <p>
                We make no warranties, expressed or implied, regarding the
                reliability, accuracy, or availability of the service.
              </p>

              <h3>Open Source</h3>
              <p>
                SprintJam is open source software licensed under the Apache 2.0
                License. You are free to self-host, modify, and distribute the
                software in accordance with the license terms.
              </p>

              <h3>Termination</h3>
              <p>
                These terms will remain in effect as long as you use the
                service. You may terminate your account at any time by
                contacting us through the support channels provided within the
                application.
              </p>
              <p>
                We reserve the right to terminate your account at any time,
                without prior notice, if you are found to be in violation of
                these terms.
              </p>
              <p>
                Upon termination, your rights to use our Service will
                immediately cease, and you must discontinue all use of the
                Service.
              </p>

              <h3>Changes to Terms</h3>
              <p>
                We may modify these Terms at any time at our sole discretion. If
                we make changes, we will provide notice by posting the updated
                Terms on our website. Your continued use of the Service after
                any such changes constitutes your acceptance of the new Terms.
              </p>

              <h3>Governing Law</h3>
              <p>
                These terms shall be governed by and construed in accordance
                with the laws of the United Kingdom, without regard to its
                conflict of law provisions.
              </p>

              <h3>Effective Date</h3>
              <p>These terms became effective on {LAST_UPDATED}.</p>
            </div>
          </div>
          <Footer priorityLinksOnly={false} />
        </div>
      </motion.div>
    </PageSection>
  );
};

export default TermsConditionsScreen;
