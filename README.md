<h1>Prompt</h1>
InReach is built for The First 72 Hours, an 8 hour digital health hackathon hosted at the University of Kansas. It effectively reduces the mental strain of caregivers by providing them with a notification system and patient dashboard. It's a cost effective and more convinient alternative for telehealth services. 

*Build a digital product that helps a family caregiver identity, obtain, and pay for the right non-clinical support during the first 72 hours after discharge.*
<ul>
    <li>A caregiver should be able to use our service within 10 minutes.</li>
    <li>Mocked payments work.</li>
    <li>Be able to demo live.</li>
</ul>

<h1>Grading</h1>
<ul>
    <li>Caregiver problem and value (clear value)</li>
    <li>Usable within 10 minutes</li>
    <li>Presentation</li>
</ul>


<h1>Context</h1>
<ul>
    <li>Dr. Nathan(?) said transportation is a big issue. Especially in rural spaces.</li>
    <li>Same with eating, which is very important for healing.</li>
    <li>What about people who don't follow the same customs, especially with biomedicine.</li>
    <li>Assume every patient is struggling.</li>
    <li>Usually solved an "artificial" problem that was flashy. Be careful to solve an actual problem.</li>
    <li>Many won't remember the exact instructions from the phycisian. Some don't speak English. Some don't have caregivers. Some can't drive. Some have disabilities.</li>
    <li>Most people (how many exactly?) go back to hospital after discharge.</li>
    <li>Documentation is huge in medicine.</li>
    <li>People can die within the first 72 hours.</li>
</ul>

We should try to be as niche as possible.

<h1>Ideas</h1>
<ul>
    <li>Who has experienced health issues in the past? Do you know of friends/family? Be niche even if the problem seems small.</li>
    <li>We should do customer discovery on other groups. Maybe call people we know.</li>
    <li>Adias cousin got in a car crash and was paralyzed (shouldn't have survived) rural ass Kansas. Kept getting moved to different hospitals.</li>
    <li>Braden's sister has a muscle deficiency and can't stand/walk. 50 lbs boxes delivered every week for medicine.</li>
    <li>Cassidy knew someone who had spinal surgery. They went right back to the hospital.</li>
    <li>Make website very accessible but simple.</li>
    <li>Reminder systemn for medicine.</li>
</ul>

<h3>Presentation</h3>
<ul>
    <li>Emphasize what 72 hours for the patient means exactly.</li>
    <li>Rural small hospitals take around __ people a year. The variable cost is $_/user given _.  This gives an estimated cost of $__.</li>
</ul>

<h3>Technical</h3>
<ul>
    <li>Use stripe or link for mock payments.</li>
    <li>Provide resources/applications for grants right below payment CTA.</li>
</ul>


<h1>Final Idea</h1>
The Business Model is to charge hospitals a small fixed rate for our doctor/patient portal (webapp). This keeps costs as low and frictionless as possible for the patient. 
The only costs are messaging fees, website maintainance, and AI costs, which are near negligable (< $1 per patient). 

Doctor view: We basically enable doctors to connect their patient's and caregivers information to SMS. They upload the documentation right after a checkup as part of a procedure which should have the patients phone number. We then have AI summarize the document and parse it into different sections: medication to take in quantity, frequency, and duration (using numeric sliders); physical therapy needs, equipment needs. (What else can we think of?). After the AI parse, the doctor reviews it and submits. Our system then submits this patient job to a cron and notifies them when directed. This process should take ~5 minutes and shouldn't need to be touched again (but can be edited).

Patient view: After discharge (and after the doctor submits the above steps), the system onboards mainly the patient's caregiver, but also the patient through SMS (A groupchat if possible). This explains what the system is for and verifies that the patient/doctor is correct. It will continue to send critical notifications, but includes a link to the patient dashboard during onboarding as well. Part of these notifications will be a prompt with a yes/no question asking whether they completed a task like "Have they taken their ibuprofen at 8 PM on Friday, Oct 9?". This patient view contains the same information as in the notifications and more. It also has numerous accessibility options like a voice to text AI assistant, a flag to change language, text size, contrast, and dark mode.

Non-critical ideas: 
A resource page for the patient view where local grants, healthcare, insurance options are listed. Can input zip code to find good food options, clinics, pharmacies, etc.