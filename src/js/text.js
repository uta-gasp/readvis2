// Requires:
//      utils/logger

(function (app) { 'use strict';

    // Text controller
    // Constructor arguments:
    //      options: {
    //          root:       - ID of the element that stores the text
    //      }
    //      services: {
    //          splitText ()        - service to split the updated text
    //      }
    function Text (options, services) {

        this.root = options.root || '#textContainer';

        _services = services;

        var logError = app.Logger.moduleErrorPrinter( 'Text' );
        _services.splitText = _services.splitText || logError( 'splitText' );

        _textContainer = document.querySelector( this.root );

        this.firstPage = [
            'Kiitos, että autat meitä! Lue teksti rauhassa loppuun asti. Sinulla ei ole kiire, sillä tämä ei ole kilpailu. Kun olet lukenut sivun loppuun, klikkaa hiirellä ”Jatka”, niin pääset seuraavalle sivulle.'
        ];

        this.texts = [
            /*[
                'Steroidivyöhykkeen pienimpiä kivikappaleita sanotaan',
                'meteoroideiksi. Joskus sellainen voi pudota maanpinnalle.',
                'Tällöin sitä kutsutaan meteoriitiksi.'
            ],*/
            /*
            [
                [
                'Asteroidit eli pikkuplaneetat ovat pääosin kivisiä,',
                'metallisia ja jäisiä kappaleita, jotka kiertävät Aurinkoa',
                'omilla radoillaan. Suurin osa asteroideista sijaitsee',
                'Marsin ja Jupiterin välissä olevalla asteroidivyöhykkeellä.'
                ]
            ],
            [
                [
                'Komeetat eli pyrstötähdet ovat pieniä kappaleita,',
                'jotka koostuvat jäästä ja pölystä. Ne kiertävät Aurinkoa',
                'omilla radoillaan. Kun komeetta liikkuu lähelle Aurinkoa,',
                'sille syntyy kaasusta ja pölystä pyrstö. Pyrstö voi olla miljoonien',
                'kilometrien pituinen. Pyrstö heijastaa Auringon valoa.'
                ]
            ],
            [
                [
                'Aurinko on Maata lähinnä oleva tähti. Se on',
                'erittäin kuuma kaasupallo. Lämpötila Auringon pinnassa on',
                'noin 6 000 °C. Auringosta säteilee valoa ja lämpöä.',
                'Maa sijaitsee sopivalla etäisyydellä Auringosta.',
                'Aurinko on kooltaan 109 kertaa suurempi kuin maapallo.',
                'Aurinko ja kahdeksan planeettaa muodostavat aurinkokunnan.'
                ]
            ],
            [
                [
                'Matka on ollut pitkä, mutta ihana. Tapasin Lapissa myös joulupukin.',
                'Minä luulin, että Lapissa on aina lunta mutta ei siellä ollut yhtään',
                'lunta. Pelkäsin, että joulupukki kysyy minulta, olenko ollut kiltti.',
                ],
                [
                'Mutta ei hän kysynyt. Joulupukki kysyi, mistä me tulemme. Minä sanoin,',
                'että tulemme Kaislarannasta. Sitten joulupukki sanoi, että oli hauska',
                'tavata ja good bye! Minä ymmärsin heti, että nyt piti lähteä.',
                ]
            ]
            */
            [
                [
                'Krokotiili hiihtää kevääseen|h1',
                'Murisevan metsän pieni krokotiili katsoi ikkunasta.',
                '– On niin harmaata. Kaikki värit ovat kadonneet.',
                'Onkohan aurinkokin mennyt talviunille?',
                'Ilta pimeni. Pieni krokotiili meni vällyjen alle sänkyynsä.',
                '– Osaisinpa vaipua talviunille niin kuin karhu.',
                'Tai horrostaa kuten siili. Nukkuisin kevääseen asti.',
                ],
                [
                'Aamulla kaikki oli muuttunut.',
                'Hankien hohde ihan häikäisi pienen krokotiilin silmiä.',
                '– Herätkää! Kevät on täällä! krokotiili innostui.',
                'Karhun talvipesästä kuului syvä kuorsaus.',
                'Siilikin pysyi lumen alla lehtikasan kätköissä.',
                'Vanha metsäjänis katsahti hihkuvaa krokotiilia ja tuhahti:',
                '– Kevät. Kaikkea sitä kuuleekin.',
                ],
                [
                'Sitten se järsi taas metsäaukion reunaan kaatunutta haapaa.',
                'Pieni krokotiili lapioi lunta aukiolta. Se hakkasi jääkimpaleita hajalle.',
                'Se halusi auttaa aurinkoa keväthommissa. Saukonpojat olivat',
                'laskemassa pyllymäkeä joen jäälle. Niillä näytti olevan hauskaa.',
                'Samassa kroko huomasi, että aurinko oli kadonnut puitten taakse.',
                '– Mihin sinä menet? Älä karkaa! krokotiili huusi. Aurinko ei kuunnellut.',
                ],
                [
                'Krokotiili haki mökistään repun. Sukset se otti saunan seinältä.',
                '– Aurinko karkaa! Ettekö te tajua? krokotiili kivahti saukonpojille.',
                '– Voi krokoparkaa! Aurinko karkaa! vanhin saukonpojista vastasi.',
                'Sen veljet vain nauroivat.',
                '– Minä otan auringon kiinni, pieni krokotiili sanoi',
                'ja lykki jo sauvoillaan vauhtia.',
                ],
                [
                '– Vai otat sinä hiihtämällä auringon kiinni, saukonpojat nauroivat.',
                '– Niinpäs otankin. Jos kevät ei suostu jäämään tänne,',
                'niin minä vaikka hiihdän kevääseen.',
                '––––––––',
                ],
                [
                'Eikö sinun pitäisi olla jo nukkumassa?',
                '– Pitäisi, krokotiili sanoi ja purskahti taas itkuun.',
                '– Älä itke. Hyppää selkääni ja näytä suunta kotiisi,',
                'susi sanoi ja jatkoi: – Minä kyllä jaksan juosta yössä.',
                ],
                [
                'Se olikin menoa! Iso harmaa susi juoksi läpi metsien ja',
                'yli järven jäisen kannen. Pieni krokotiili piti suden niskavilloista kiinni.',
                'Koko taivaankansi välkehti ja helisi talviyön hurjaa kauneutta.',
                'Kotona krokotiili lämmitti saunan. Susi ei ollut ennen päässyt saunomaan.',
                '– Huh. Onpas täällä lämmin, susi ihmetteli.',
                '– Kuumempaa kuin kesän helteillä.',
                '––––––––',
                ],
                [
                'Aamulla aurinko näyttäytyi taas.',
                '– Tänään aurinko viipyy luonamme hieman pidempään kuin eilen,',
                'susi sanoi hampaita harjatessaan.',
                '– Niin. Ja huomenna vielä pidempään, krokotiili sanoi.',
                '– Tule laskemaan pyllymäkeä, saukonpojat huusivat.',
                ],
                [
                '– Joo! Ja sitten lämmitän taas saunan ja menemme',
                'porukalla avantouinnille. Olen jo ottanut uimahousut esille',
                'sitä varten, krokotiili sanoi.',
                'Krokotiili lähti saukonpoikien seuraksi. Ne laskivat mäkeä',
                'koko talven. Ne laskivat, saunoivat ja pulikoivat kevääseen asti.',
                'Mutta välillä ne joivat aina kaakaota.',
                'Hannu Hirvonen|authors',
                ]
            ],

            [
                [
                'Heinähattu, Vilttitossu ja iso Elsa|h1',
                'Heinähattu on tunnollinen koululainen.',
                'Pikkusisko Vilttitossu on aivan toisenlainen.',
                'Hän rupeaa heti pinnaamaan koulusta, koska häntä nimitellään.',
                'Koulu pilkotti puiden takaa. Pihalta kuului lasten melua.',
                'Välitunti, Vilttitossu ajatteli. Sitten hän käänsi koululle',
                'selkänsä ja lähti tarpomaan lumihangessa kylän keskustaan.',
                ],
                [
                'Vilttitossu katseli lumista maisemaa ja ajatteli,',
                'että ihan kuin suuria lakanoita olisi levitetty peltojen yli.',
                'Sieltä täältä hangesta pisti esiin kuivuneita heinänkorsia.',
                'Koiran haukunta kuului jostain kaukaa.',
                'Vilttitossu ravisteli lunta saappaistaan päästyään',
                'nietoksesta kylätielle. Hän hyppeli reppu selässään ja rallatti:',
                '– Ei ole koulua ollenkaan, ollenkaan, ei ole koulua ollenkaan, ollenkaan…',
                ],
                [
                'Puhdas lumihanki houkutteli Vilttitossun heittäytymään selälleen.',
                'Hän teki enkelinkuvia ja katseli taivaalla vaeltavia pilviä.',
                'Siinä on ihan kuin koira ja siinä on ihan kuin jonkun ihmisen',
                'naama. Nyt se lähestyy sitä koiraa ja ottaa sen kiinni.',
                'Miksi minä en voisi hoitaa koiria ja kissoja silloin,',
                'kun muut ovat koulussa? Alibullenin neidithän sanoivat,',
                'että myös eläimiä hoitaessa oppii yhtä ja toista.',
                ],
                [
                'Vilttitossu havahtui lasten kiljahduksiin.',
                'Hän näki, kuinka koululta päin marssi värikäs retkue opettajan johdolla.',
                '– Meidän luokka! Vilttitossu parahti. – Ne ovat lähteneet retkelle!',
                'Vilttitossu ryömi tuuhean kuusen alle piiloon.',
                'Täältä minua ei huomata, hän ajatteli.',
                ],
                [
                'Äänet tulivat lähemmäksi. Opettaja tuntui kysyvän,',
                'mitä puita ympärillä näkyy. Sitten opettaja tuli kuusen',
                'juurelle seisomaan. Hän oli niin lähellä, että Vilttitossu',
                'olisi voinut tarttua jalasta kiinni.',
                '– Minkä puun oksaa minä nyt ravistan? hän kysyi ja',
                'pöllytti kasan lunta Vilttitossun päälle.',
                ],
                [
                '– Kuusen! huusivat kaikki yhdestä suusta, ja Vilttitossusta tuntui,',
                'että kaksikymmentä silmäparia tuijotti sitä kohtaa,',
                'missä hän oli piilossa.',
                'Sinikka Nopola & Tiina Nopola|authors',
                ]
            ],

            [
                [
                'Muumilaaksossa|h1',
                'Eräänä harmaana aamuna ensilumi laskeutui Muumilaaksoon.',
                'Se hipsi maahan hiljaa ja tiheänä, ja muutamassa tunnissa',
                'kaikki oli valkoista.',
                'Muumipeikko seisoi portailla ja katseli, miten laakso veti',
                'talvilakanan päälleen. Hän ajatteli itsekseen:',
                'tänä iltana painumme pehkuihin.'
                ],
                [
                'Niinhän näet kaikkien muumipeikkojen oli tapana tehdä joskus',
                'marraskuussa (ja siinä ne tekevät viisaasti, koska he eivät rakasta',
                'pimeää ja pakkasta). Hän sulki oven, meni äitinsä luo ja sanoi:',
                '– Lumi on tullut.',
                '– Tiedän, sanoi Muumipeikon äiti. – Minä olen jo laittanut vuoteet ja',
                'pannut niihin kaikkein lämpöisimmät peitteet. Sinä saat nukkua pikku',
                'otus Nipsun kanssa läntisessä ullakkohuoneessa.',
                ],
                [
                '– Mutta Nipsu kuorsaa niin kauheasti, sanoi Muumipeikko.',
                '– Enkö saa nukkua mieluummin Nuuskamuikkusen kanssa?',
                '– Kuten haluat, Muumimamma sanoi.',
                '– Nukkukoon Nipsu sitten itäisessä ullakkohuoneessa.',
                'Näin muumiperhe ja kaikki heidän ystävänsä ja tuttavansa valmistautuivat',
                'perusteellisesti ja tosissaan viettämään pitkää talvea.',
                ],
                [
                'Muumipeikon äiti kattoi heille pöydän kuistille, mutta jokainen',
                'sai kuppiinsa ainoastaan kuusenneulasia. (On näet tärkeää, että',
                'vatsa on täynnä kuusenneulasia, jos aikoo nukkua kolme kuukautta.)',
                'Kun päivällinen oli syöty (eikä se maistunut juuri miltään),',
                'sanottiin tavallista perusteellisemmin hyvää yötä, ja äiti',
                'kehotti kaikkia harjaamaan hampaansa.',
                ],
                [
                'Sitten muumipeikon isä kulki ympäri taloa ja sulki',
                'kaikki ovet ja ikkunaluukut ja ripusti kattokruunuun',
                'kärpäsverkon, jottei se pölyyntyisi. Ja sitten itse',
                'kukin kömpi vuoteeseensa, kaivoi itselleen mukavan kuopan,',
                'veti peiton korvilleen ja ajatteli jotakin hauskaa.',
                ],
                [
                'Mutta Muumipeikko huokaisi ja sanoi:',
                '– Tässä menee joka tapauksessa melko paljon aikaa hukkaan.',
                '– Mitä vielä! sanoi Nuuskamuikkunen. – Mehän näemme unia.',
                'Ja kun heräämme taas, on kevät…',
                '– Niin, Muumipeikko mutisi. Hän oli jo',
                'liukunut kauas unien puolihämärään.',
                ],
                [
                'Ulkona satoi lunta hiljaa ja tiheästi. Se peitti jo portaat ja riippui',
                'raskaana yli katon ja ikkunanpielien. Pian koko muumitalo oli',
                'vain pehmeä, pyöreä lumikinos. Kellot lakkasivat toinen toisensa',
                'jälkeen tikittämästä, talvi oli tullut.',
                'Tove Jansson|authors',
                ]
            ],

            [
                [
                'Olympialaiset|h1',
                'Olympialaiset on kuuluisin kansainvälinen urheilukilpailu.',
                'Olympialaisiin voi osallistua urheilijoita',
                'kaikista maapallon maista.',
                'Kesäolympialaiset ovat joka neljäs vuosi.',
                'Talviolympialaiset ovat joka neljäs vuosi.',
                'Mutta ne eivät ole samana vuonna.',
                ],
                [
                'Ensimmäiset olympialaiset järjestettiin Kreikassa.',
                'Suomessa on pidetty yhdet kesäolympialaiset vuonna 1952.',
                'Jokaisen lajin kolme parasta saa mitalin.',
                'Kahdeksan parasta saa kunniakirjan.',
                'Jokainen olympialaisiin osallistuva urheilija saa muistomitalin.',
                'Urheilijalle olympialaiset on unohtumaton kokemus.',
                ],
                [
                'Olympiarenkaat|h2',
                'Olympialipussa on olympiarenkaat.',
                'Renkaat edustavat viittä eri maanosaa.',
                'Sininen rengas edustaa Eurooppaa,',
                'keltainen Aasiaa, musta Afrikkaa,',
                'vihreä Australiaa ja punainen Amerikkaa.',
                ],
                [
                'Olympiatuli|h2',
                'Olympiatuli sytytetään aina Kreikassa.',
                'Olympiasoihtu kuljetetaan kilpailupaikalle.',
                'Olympiatuli palaa kisojen ajan stadionilla.',
                'Se sammutetaan kisojen päättäjäisissä.',
                ]
            ],

            [
                [
                'Suomi on tasavalta|h1',
                'Suomi on itsenäinen valtio. Se tarkoittaa sitä, että',
                'Suomi päättää omista asioistaan ja sillä on lippu ja',
                'kansallislaulu. Suomi itsenäistyi 6.12.1917.',
                'Suomea johtaa presidentti. Suomi on siis tasavalta.\\b Yhdessä',
                'presidentin kanssa maata johtaa eduskunta. Suomalaiset valitsevat',
                'eduskuntaan 200 kansanedustajaa|b.'
                ],
                [
                'Eduskunta säätää lakeja ja päättää muista Suomen asioista.',
                'Eduskunnan apuna toimii hallitus,\\b johon kuuluu',
                'pääministeri ja muita ministereitä.',
                'Suomi on Euroopan\\b unionin\\b (EU) jäsen. EU on perustettu ',
                'eurooppalaisen yhteistyön edistämiseksi.',
                ],
                [
                'Sinäkin olet kuntalainen|h2',
                'Koko Suomi on jaettu kuntiin.\\b Osa kunnista on kaupunkeja. Kunnat',
                'tarjoavat asukkailleen esimerkiksi seuraavia palveluja: koulu,',
                'terveyskeskus, kirjasto ja palokunta. Kuntien palvelut ovat yleensä',
                'halpoja. Kunnat saavat rahaa, kun aikuiset kuntalaiset käyvät töissä. Osa',
                'heidän palkastaan maksetaan valtiolle ja kunnalle. Maksun nimi on vero.\\b',
                ]
            ],

            [
                [
                'Suomi ja suomalaisuus|h1',
                'Suomalaisilla on monta ylpeyden aihetta. Suomessa on puhdas luonto ja',
                'neljä erilaista vuodenaikaa. Suomalaisten valmistamia tuotteita, kuten',
                'puhelimia, arvostetaan ulkomailla. Suomalaisilla on hyvä koulutus, ja',
                'voimme olla ylpeitä myös urheilijoistamme.',
                ],
                [
                'Suomi on harvaan asuttu maa|h2',
                'Suomi on melko suuri maa, mutta asukkaita on vähän. Suomalaisia on',
                'hieman yli viisi miljoonaa. Suomi on siis harvaan asuttu maa.',
                'Melkein kaikkien suomalaisten äidinkieli on suomi|b.',
                'Rannikoilla ja Ahvenanmaalla puhutaan lisäksi ruotsia.\\b',
                'Pohjois-Suomessa puhutaan myös saamea.\\b',
                ],
                [
                'Erilaiset ihmiset ovat rikkaus|h2',
                'Suomen kouluissa on lapsia, jotka ovat muuttaneet Suomeen ulkomailta.',
                'Ehkä tunnet koulustasi jonkun maahanmuuttajan tai sinä itse olet',
                'maahanmuuttaja. Ihmiset muuttavat maasta toiseen esimerkiksi',
                'työn takia. Joidenkin on pakko jättää kotimaansa sodan tai muun vaaran',
                'takia. Kaikki Suomessa on vierasta maahanmuuttajalle. Me voimme',
                'kuitenkin auttaa toisiamme. Erilaisuus tekee elämästä mielenkiintoista!',
                ]
            ],

            [
                [
                'Helsinki on Suomen pääkaupunki|h1',
                'Helsinki sijaitsee Etelä-Suomessa Itämeren rannalla. Helsinki on',
                'Suomen suurin kaupunki. Siellä on asukkaita yli 600 000.',
                'Pääkaupunkiseutuun\\b kuuluvat lisäksi Espoo,\\b Vantaa\\b ja Kauniainen.\\b',
                'Yli miljoona suomalaista asuu pääkaupunkiseudulla.',
                ],
                [
                'Helsingissä on vilkas liikenne|h2',
                'Helsinki on Suomen tärkein satamakaupunki. Sen satamiin saapuu',
                'joka päivä paljon laivoja, jotka kuljettavat ihmisiä ja tavaroita.',
                'Rautatieasema on aivan Helsingin keskustassa. Sinne saapuu paljon',
                'junia muualta Suomesta. Helsingissä on Suomen ainut lähes kokonaan',
                'maan alla oleva junaverkosto, metro.\\b Suomen vilkkain lentokenttä,',
                'Helsinki-Vantaan lentokenttä, sijaitsee Vantaalla.',
                ],
                [
                'Helsingin nähtävyyksiä|h2',
                'Helsingissä on paljon nähtävää. Linnanmäen huvipuisto on',
                'Suomen suosituin matkailukohde. Korkeasaaressa on eläintarha.',
                'Finlandia-talossa järjestetään paljon kokouksia ja konsertteja.',
                'Mielenkiintoinen paikka on myös Suomenlinna, joka on vanha',
                'linnoitus saaristossa Helsingin edustalla.',
                ]
            ],

            [
                [
                'Suomen kaupunkeja|h1',
                'Espoo\\b on Suomen toiseksi suurin kaupunki. Vuonna 2012 siellä asui',
                'noin 255 000 ihmistä. Monet espoolaiset käyvät töissä pääkaupungissa,',
                'koska Espoo sijaitsee Helsingin lähellä. Espoossa voit viettää',
                'hauskan päivän vesipuisto Serenassa tai näyttelykeskus WeeGee:ssä.',
                'Voit myös ulkoilla Nuuksion kansallispuistossa tai Espoon kauniissa',
                'järvi- ja merimaisemissa.',
                ],
                [
                'Tampere\\b on Suomen kolmanneksi suurin kaupunki. Siellä asuu',
                'noin 217 000 ihmistä. Tampere sijaitsee kahden järven välissä.',
                'Tampere on Suomen ensimmäinen teollisuuskaupunki.',
                'Tampereen kuuluisimpia nähtävyyksiä ovat Näsinneula',
                'ja Särkänniemen elämyspuisto.'
                ],
                [
                'Turku\\b on Suomen vanhin kaupunki. Asukkaita on noin 180 000.',
                'Turku sijaitsee meren rannalla Aurajoen suulla. Turussa on suuri',
                'ja vilkasliikenteinen satama. Turussa riittää paljon nähtävää,',
                'esimerkiksi Turun tuomiokirkko, Turun linna ja Luostarimäen',
                'puusta rakennettu käsityöläisalue.'
                ],
                [
                'Jyväskylä\\b sijaitsee keskellä Suomea. Siitä on tullut',
                'tärkeä liikennekeskus. Jyväskylässä asukkaita on noin 133 000.',
                'Jyväskylässä voi ulkoilla kaupungin keskellä kohoavalla harjulla.',
                'Lisäksi voit vierailla vaikka satu- ja seikkailupuisto Peukkulassa.',
                ],
                [
                'Vaasa\\b on tärkeä satama- ja kauppakaupunki. Vaasassa on asukkaita',
                'noin 61 000. Vaasan satamasta pääset matkustajalaivalla Ruotsiin.',
                'Sinne on Vaasasta vain 80 kilometriä. Ruotsin kieltä voit',
                'kuulla Vaasassakin, vaikkapa Kauppatorilla.',
                'Wasalandian huvipuisto on hauska vierailukohde.',
                ],
                [
                'Savonlinna\\b sijaitsee Itä-Suomessa. Se on kaunis',
                'järviliikenteen keskus. Siellä asuu noin 27 000 ihmistä.',
                'Savonlinnassa on keskiaikainen linna, Olavinlinna.',
                ],
                [
                'Kuopio\\b on Itä-Suomen suurin kaupunki. Siellä on asukkaita',
                'noin 98 000. Maasto on Kuopiossa mäkistä. Kaupungin korkein',
                'mäki on Puijo. Puijolla on kuuluisa talviurheilukeskus sekä',
                'näkötorni. Matkailijan kannattaa tutustua myös Kuopion toriin,',
                'jota kuopiolaiset kutsuvat ”mualiman navaksi”.',
                ],
                [
                'Oulu\\b on Suomen kuudenneksi suurin kaupunki. Sen asukasluku',
                'on 145 000. Oulu sijaitsee Perämeren rannalla Oulujoen suulla.',
                'Oulusta löytyy esimerkiksi Tiedekeskus,',
                'Tietomaa sekä kävelykatu Rotuaari.',
                ],
                [
                'Rovaniemi\\b sijaitsee Lapissa. Siellä asuu noin 61 000 ihmistä.',
                'Rovaniemi sijaitsee aivan napapiirin lähellä.',
                'Joulupukin pajakylä sijaitsee Rovaniemellä.',
                ],
            ]
        ];

        this.spacings = ['x-small', 'small', 'median', 'large', 'x-large'];

        this._initialVisibility = false;
        this.hide();

        this.switchText( _textIndex );
        this.switchSpacing( _spacingIndex );

        this.texts.forEach( text => {
            text.unshift( this.firstPage );
        })
    }

    Text.prototype.reset = function () {
        _pageIndex = 0;
        this.switchText( _textIndex );
    }

    Text.prototype.initialVisibility = function (value) {
        if (value !== undefined) {
            this._initialVisibility = value;
            if (this._initialVisibility) {
                this.show();
            }
            else {
                this.hide();
            }
        }
        else {
            return this._initialVisibility;
        }
    };

    Text.prototype.switchText = function (index) {
        const pages = this.texts[ index ];
        if (!pages) {
            return;
        }

        _textIndex = index;
        _textContainer.innerHTML = '';

        const reBold = /(\S+)(\\b)/g;
        const textLines = pages[ _pageIndex ];
        textLines.forEach( textLine => {
            const textParts = textLine.split( '|' );
            const line = document.createElement('div');

            //let lineText = textParts[0].replace( /(^|\s)\\b(\s|$)/gm, ' ' );
            let lineText = textParts[0].replace( reBold, '<span class="bold"> $1</span>' );
            line.innerHTML = lineText;

            line.classList.add( 'line' );
            for (let i = 1; i < textParts.length; i++) {
                line.classList.add( textParts[i] );
            }
            _textContainer.appendChild( line );
        })

        _services.splitText();
    };

    Text.prototype.switchSpacing = function (index) {
        _textContainer.classList.remove( this.spacings[ _spacingIndex ] );
        _spacingIndex = +index;
        _textContainer.classList.add( this.spacings[ _spacingIndex ] );
    };

    Text.prototype.show = function() {
        _textContainer.classList.remove( 'invisible' );
    };

    Text.prototype.hide = function() {
        _textContainer.classList.add( 'invisible' );
    };

    Text.prototype.getSetup = function () {
        const textStyle = window.getComputedStyle( _textContainer );
        return {
            text: this.getText(),
            textID: _textIndex,
            lineSize: _spacingIndex,
            font: {
                size: textStyle.fontSize,
                family: textStyle.fontFamily,
                style: textStyle.fontStyle,
                weight: textStyle.fontWeight
            }
        };
    };

    Text.prototype.getCurrentTextIndex = function () {
        return _textIndex;
    };

    Text.prototype.getCurrentSpacingIndex = function () {
        return _spacingIndex;
    };

    Text.prototype.getTextTitles = function () {
        return this.texts.map( text => {
            return this.getTextTitle( text );
        });
    }

    Text.prototype.getTextTitle = function (text) {
        const pageIndex = Math.min( 1, text.length );
        return text[ pageIndex ][0].split( '|' )[0];
    }

    Text.prototype.getText = function () {
        var result = [];
        this.texts[ _textIndex ].forEach( (page, index) => {
            if (index > 0) {
                result.push( page.join( '\n' ) );
            }
        });
        return result.join( '\n\n' );
    };

    Text.prototype.setText = function (text) {
        var textRef = this.texts[ _textIndex ];
        textRef.length = 1;
        textRef.isModified = true;

        var pages = text.split( '\n\n' );
        pages.forEach( page => {
            textRef.push( page.split( '\n' ) );
        });

        this.switchText( _textIndex );
    };

    Text.prototype.getModifiedTexts = function () {
        return this.texts.map( text => {
            return text.isModified ? text.slice(1) : [];
        });
    }

    Text.prototype.setTexts = function (texts) {
        //this.texts = texts;
        texts.forEach( (text, index) => {
            if (!text.length) {
                return;
            }

            text.unshift( this.firstPage );
            text.isModified = true;
            this.texts[ index ] = text;
        })

        this.switchText( _textIndex );
    };

    Text.prototype.getPageIndex = function () {
        return _pageIndex;
    };

    Text.prototype.setPageIndex = function (index) {
        if (index < 0 || index >= this.texts[ _textIndex ].length) {
            return;
        }

        _pageIndex = index;
        this.switchText( _textIndex );
    };

    Text.prototype.nextPage = function () {
        this.setPageIndex( _pageIndex + 1 );
    };

    Text.prototype.hasNextPage = function () {
        return (_pageIndex + 1) < this.texts[ _textIndex ].length;
    };

    Text.prototype.getAlign = function () {
        return _textContainer.classList.contains( 'alignLeft' ) ? 0 : 1;
    };

    Text.prototype.setAlign = function (value) {
        if (value === 'left' || value === 0)  {
            _textContainer.classList.add( 'alignLeft' );
        }
        else {
            _textContainer.classList.remove( 'alignLeft' );
        }
    };

    var _textContainer;
    var _services;
    var _textIndex = 0;
    var _pageIndex = 0;
    var _spacingIndex = 1;

    app.Text = Text;

})( this.Reading || module.exports );
