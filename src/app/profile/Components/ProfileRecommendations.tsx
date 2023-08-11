import {useEffect, useState} from "react";
import {createEvent} from "@/functions/database_functions/events";
import {
    deleteRecommendation,
    modifyRecommendation,
    submitRecommendation
} from "@/functions/database_functions/recommendations";
import {retrieveSongAnalytics} from "@/functions/spotify_functions/spotify";
import {getItemType, getLIDescription, getLIName} from "@/functions/analysis_functions/general";
import {SelectionModal} from "@/shared_components/modals";
import {Artist, Recommendation, Song} from "@/interfaces/DatabaseInterfaces";
import {Album} from "@/interfaces/SpotifyInterfaces";


const RecommendationSelectionModal = (props) => {
    const {showModal, setShowModal, recommendations, setRecommendations, pageGlobalUserID, initialItem = null} = props;

    const handleSubmit = async (selectedItem: Song | Artist | Album, type: "songs" | "artists" | "albums", description: string) => {

        if ("analytics" in selectedItem) {
            selectedItem.analytics = await retrieveSongAnalytics(selectedItem.song_id);
        }
        await submitRecommendation(pageGlobalUserID, selectedItem, type, description).then(() => {
            retrieveProfileRecommendations(pageGlobalUserID).then(res => setRecommendations(res));
        });
    }

    const handleModify = async (selectedItem: Song | Artist | Album, type: "songs" | "artists" | "albums", description: string) => {
        const existingRecIndex = recommendations.findIndex(r => r.item[`${type.slice(0, type.length - 1)}_id`] === selectedItem[`${type.slice(0, type.length - 1)}_id`]);
        const existingRec = recommendations[existingRecIndex];
        await modifyRecommendation(pageGlobalUserID, existingRec, type, description).then(() => {
            retrieveProfileRecommendations(pageGlobalUserID).then(res => setRecommendations(res));
        })
    }

    return (
        <SelectionModal
            showModal={showModal}
            setShowModal={setShowModal}
            onModify={handleModify}
            onSubmit={handleSubmit}
            modifyTarget={initialItem}
            description
        />
    )
}

export const ProfileRecommendations = function (props: { pageGlobalUserID: string; isOwnPage: boolean; }) {
    const {pageGlobalUserID, isOwnPage} = props;
    // Only songs and artists at the moment
    const [recs, setRecs] = useState([]);
    const [showSelection, setShowSelection] = useState(false);
    const [initialItem, setInitialItem] = useState(null);


    useEffect(() => {
        retrieveProfileRecommendations(pageGlobalUserID).then(res => setRecs(res));
    }, [])

    const handleDelete = (e) => {
        console.log(e);
        deleteRecommendation(e.id).then(() => {
            createEvent(51, pageGlobalUserID, e.item, getItemType(e.item));
            retrieveProfileRecommendations(pageGlobalUserID).then(res => setRecs(res));
        });
    }

    const handleEdit = (e) => {
        setInitialItem(e.item);
        setShowSelection(true);
    }

    return (
        <div style={{width: '100%', position: 'relative'}}>
            {isOwnPage && (
                <button className={'subtle-button'}
                        onClick={() => {
                            setShowSelection(true);
                            setInitialItem(null);
                        }}>
                    New
                </button>
            )}
            <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '15px',
                flexWrap: 'wrap',
                margin: '16px 0',
            }}>
                {recs.length > 0 ?
                    recs.map(e => {
                        const type = getItemType(e.item);
                        return <Recommendation key={e.id} rec={e} type={type} isOwnPage={isOwnPage}
                                               handleDelete={handleDelete} handleEdit={handleEdit}/>
                    })
                    :
                    <p style={{color: 'var(--secondary-colour)'}}>Looks like there aren't any recommendations yet.</p>
                }
            </div>
            <RecommendationSelectionModal initialItem={initialItem} showModal={showSelection}
                                          setShowModal={setShowSelection}
                                          recommendations={recs} setRecommendations={setRecs}
                                          pageGlobalUserID={pageGlobalUserID}/>
        </div>
    )
}

const Recommendation = (props: { rec: Recommendation; type: "songs" | "artists" | "albums"; isOwnPage: boolean; handleDelete: Function; handleEdit: Function; }) => {
    const {rec, type, isOwnPage, handleDelete, handleEdit} = props;
    return (
        <div key={rec.id} style={{
            display: 'flex',
            flexDirection: 'row',
            flexGrow: '1',
            gap: '15px',
            background: 'rgba(125, 125, 125, 0.1)',
            border: '1px solid rgba(125, 125, 125, 0.75)',
            padding: '15px',
            width: 'max-content',
            overflow: 'hidden',
            wordBreak: 'break-word'
        }}>
            <div className={'supplemental-content'} style={{position: 'relative', height: '150px', width: '150px'}}>
                <img alt={`${getLIName(rec.item)}`} src={rec.item.image} className={'backdrop-image'}
                     style={{aspectRatio: '1', width: '125%', objectFit: 'cover'}}/>
                <img alt={`${getLIName(rec.item)}`} src={rec.item.image} className={'levitating-image'}
                     style={{aspectRatio: '1', width: '100%', objectFit: 'cover'}}/>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', flexGrow: '1', minWidth: '200px'}}>
                <p style={{
                    margin: '0',
                    textTransform: 'capitalize',
                    color: 'var(--accent-colour)'
                }}>{type.slice(0, type.length - 1)}</p>
                <h2 style={{margin: '0'}}>
                    {getLIName(rec.item)}
                    <span style={{margin: '5px 0 0 10px'}}>
                                            <SpotifyLink simple link={rec.item.link}/>
                                        </span>
                </h2>
                <p style={{margin: '0'}}>{getLIDescription(rec.item)}</p>
                {rec.description.length > 0 && (
                    <p style={{marginBottom: 0}}>
                        <em>
                            <span style={{color: 'var(--accent-colour)', margin: '0 2px'}}>`&quot;`</span>
                            {rec.description}
                            <span style={{color: 'var(--accent-colour)', margin: '0 2px'}}>`&quot;`</span>
                        </em>
                    </p>
                )}
                {isOwnPage && (
                    <div style={{display: 'flex', margin: 'auto 0 0 auto', gap: '15px'}}>
                        <button className={'subtle-button'} onClick={() => handleEdit(rec)}>Edit</button>
                        <button className={'subtle-button'}
                                onClick={() => handleDelete(rec)}>
                            Delete
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}