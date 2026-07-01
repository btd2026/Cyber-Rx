import ExecSummary from './ciso/views/ExecSummary'
import Q1 from './ciso/views/Q1'
import Q2 from './ciso/views/Q2'
import Q3 from './ciso/views/Q3'
import Q4 from './ciso/views/Q4'
import Q5 from './ciso/views/Q5'
import FrameworkPosture from './ciso/views/FrameworkPosture'
import MyLiability from './ciso/views/MyLiability'
import CrownJewelsView from '../crownjewels/CrownJewelsView'

export default function CisoSeat({ tab, go }: { tab: string; go: (t: string) => void }) {
  return (
    <div className="seat">
      {tab === 'exec' && <ExecSummary go={go} />}
      {tab === 'q1' && <Q1 />}
      {tab === 'q2' && <Q2 />}
      {tab === 'q3' && <Q3 go={go} />}
      {tab === 'q4' && <Q4 />}
      {tab === 'q5' && <Q5 go={go} />}
      {tab === 'qF' && <FrameworkPosture />}
      {tab === 'qL' && <MyLiability go={go} />}
      {tab === 'qCJ' && <CrownJewelsView />}
    </div>
  )
}
