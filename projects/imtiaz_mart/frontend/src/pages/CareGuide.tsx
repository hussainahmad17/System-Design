import { Link } from "react-router";
import Img from "../components/Img";
import "./content.css";

export default function CareGuide() {
  return (
    <>
      <header className="container page-head">
        <h1>Leather care guide</h1>
        <p>Full-grain leather needs about ten minutes of care, twice a year. Here's how to do it.</p>
      </header>

      <div className="container section content-split">
        <article className="prose">
          <h2>Everyday wear</h2>
          <ul>
            <li>Hang your jacket on a wide, padded hanger so the shoulders keep their shape.</li>
            <li>Empty the pockets. Keys and phones stretch the leather over time.</li>
            <li>Let it breathe. Never store leather in a plastic bag.</li>
          </ul>

          <h2>Clean and condition</h2>
          <p>Do this every six months, or whenever the leather looks dry or dull.</p>
          <ol className="steps">
            <li><strong>Dust it off.</strong> Wipe the whole jacket with a soft, dry cloth.</li>
            <li><strong>Spot clean.</strong> Dab marks with a cloth dampened with water. Don't rub, and don't use soap.</li>
            <li><strong>Test the conditioner.</strong> Try a small amount inside the hem and wait an hour.</li>
            <li><strong>Condition.</strong> Work a thin layer in with small circles. Less is more.</li>
            <li><strong>Rest and buff.</strong> Leave it overnight, then buff with a clean cloth.</li>
          </ol>

          <h2>Caught in the rain</h2>
          <p>Shake off the water and let the jacket dry at room temperature on a hanger. Keep it away from radiators, heaters and hair dryers. Heat makes leather crack.</p>

          <h2>Storing for the season</h2>
          <p>Store it in a cotton garment bag in a cool, dark wardrobe. Condition it before you put it away and again when you take it out.</p>

          <h2>What to avoid</h2>
          <ul>
            <li>Direct sunlight for long periods. It fades the colour.</li>
            <li>Perfume, hairspray and alcohol-based cleaners.</li>
            <li>Washing machines and dry cleaners that don't specialise in leather.</li>
          </ul>

          <p className="callout">Torn seam or broken zip? Every Scale Cart jacket has free repairs for life. <Link to="/pages/contact" className="link">Contact us</Link> to arrange one.</p>
        </article>

        <aside className="content-split__aside">
          <Img id="1778882996728-952ed23dc6f4" alt="Close-up of brown full-grain leather showing its natural grain" ratio={1.25} sizes="(min-width: 900px) 35vw, 100vw" />
        </aside>
      </div>
    </>
  );
}
